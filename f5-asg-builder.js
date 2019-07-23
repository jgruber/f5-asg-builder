#!/usr/bin/env node

/* jshint esversion: 6 */
/* jshint node: true */

'use strict';

const program = require('commander');
const child_process = require('child_process');
const fs = require('fs');
const mkdirp = require('mkdirp');
const url = require('url');
const md5 = require('apache-md5');
const request = require('sync-request');
const colors = require('colors');

let createBaiscAuth = (name, user, pass) => {
    if (user === undefined || pass === undefined) {
        const basic_auth_err = colors.red.underline(
            'basic authorization required both user and password options to be defined');
        throw new Error(basic_auth_err);
    }
    const basic_auth_dir = __dirname + '/' + name + '/basic-auth/auth/';
    if (!fs.existsSync(basic_auth_dir)) {
        mkdirp.sync(basic_auth_dir);
    }
    const basic_pass_dir = __dirname + '/' + name + '/basic-auth/pass/';
    if (!fs.existsSync(basic_pass_dir)) {
        mkdirp.sync(basic_pass_dir);
    }
    let auth_file = 'AuthType Basic\n' +
        'AuthName "Restricted Access"\n' +
        'AuthUserFile /etc/www/pass/htpasswd.user\n' +
        'Require valid-user\n';
    fs.writeFileSync(basic_auth_dir + 'basic_auth.conf', auth_file);
    const pwhash = md5(pass);
    let password_file = user + ':' + pwhash + '\n';
    fs.writeFileSync(basic_pass_dir + 'htpasswd.user', password_file);
};

let createLDAPAuth = (name, ldapurl, ldapbinddn, ldapbindpassword) => {
    if (ldapurl === undefined ||
        ldapbinddn === undefined ||
        ldapbindpassword === undefined) {
        const ldap_auth_err = colors.red.underline(
            'LDAP authorization requires ldapurl, ldapbinddn and ldapbindpassword options to be defined');
        throw new Error(ldap_auth_err);
    }
    const ldap_auth_dir = __dirname + '/' + name + '/ldap-auth/auth/';
    if (!fs.existsSync(ldap_auth_dir)) {
        mkdirp.sync(ldap_auth_dir);
    }
    let auth_file = 'AuthType Basic\n' +
        'AuthName "Restricted Access"\n' +
        'AuthBasicProvider ldap\n\n' +
        'AuthLDAPURL "' + ldapurl + '"\n' +
        'AuthLDAPBindDN "' + ldapbinddn + '"\n' +
        'AuthLDAPBindPassword "' + ldapbindpassword + '"\n' +
        'Require valid-user\n';
    fs.writeFileSync(ldap_auth_dir + 'ldap.conf', auth_file);
};

let embedRPMs = (name, rpms) => {
    if (Array.isArray(rpms)) {
        const rpm_dir = __dirname + '/' + name + '/rpms/';
        if (!fs.existsSync(rpm_dir)) {
            mkdirp.sync(rpm_dir);
        }
        var cp_text = '';
        for (let idx = 0; idx < rpms.length; idx++) {
            const rpm_file = rpms[idx].substring(rpms[idx].lastIndexOf('/') + 1);
            cp_text = cp_text + 'COPY rpms/' + rpm_file + ' /root/lx/' + rpm_file + '\n';
            if (fs.existsSync(rpm_dir + rpm_file)) {
                process.stdout.write(colors.red(rpms[idx] + ' already downloaded.. skipping\n'));
            } else {
                const rpm_url = url.parse(rpms[idx]);
                if (rpm_url.protocol == 'file:') {
                    fs.copyFileSync(rpm_url.path, rpm_dir + rpm_file);
                } else {
                    process.stdout.write(colors.yellow('downloading ' + rpms[idx] + '\n'));
                    var res = request('GET', rpms[idx]);
                    fs.writeFileSync(rpm_dir + rpm_file, res.getBody());
                }
            }
        }
        return cp_text;
    } else {
        return '';
    }
};

let createDockerImage = (options) => {

    if (options.imagename === undefined) {
        throw new Error(colors.red.underline(
            'you must supply a name with -n or --imagename option'));
    }

    options.imagename = options.imagename.toLowerCase();

    mkdirp.sync(__dirname + '/' + options.imagename);

    var dockerfile_text = 'FROM ' + options.image + '\n\n';

    // authorization entries in Dockerfile
    var use_basic_auth = false;
    var use_ldap_auth = false;
    if (options.auth === 'basic') {
        use_basic_auth = true;
        createBaiscAuth(options.imagename, options.user, options.password);
        dockerfile_text = dockerfile_text + "ENV AUTH='CUSTOM'\n";
        dockerfile_text = dockerfile_text + "COPY basic-auth/auth/basic_auth.conf /usr/local/apache2/conf/auth/basic.conf\n";
        dockerfile_text = dockerfile_text + "COPY basic-auth/pass/htpasswd.user /etc/www/pass/htpasswd.user\n";
    } else if (options.auth == 'ldap') {
        use_ldap_auth = true;
        createLDAPAuth(options.imagename, options.ldapurl, options.ldapbinddn, options.ldapbindpassword);
        dockerfile_text = dockerfile_text + "ENV AUTH='CUSTOM'\n";
        dockerfile_text = dockerfile_text + "COPY basic-auth/auth/ldap.conf /usr/local/apache2/conf/auth/basic.conf\n";
    } else {
        dockerfile_text = dockerfile_text + "ENV AUTH='DISABLE'\n";
    }

    if (options.tlsport > 0) {
        dockerfile_text = dockerfile_text + "EXPOSE " + options.tlsport + ':443/tcp \n';
    }

    if (Array.isArray(options.bigips)) {
        var bigipdefs = options.bigips.join(' ');
        dockerfile_text = dockerfile_text + "ENV BIGIP_LIST='" + bigipdefs + "'\n";
    }

    if (Array.isArray(options.rpms)) {
        const cp_text = embedRPMs(options.imagename, options.rpms);
        dockerfile_text = dockerfile_text + cp_text;
    }

    fs.writeFileSync(__dirname + '/' + options.imagename + '/Dockerfile', dockerfile_text);

    child_process.execFileSync('docker', ['build', options.imagename, '-t', options.imagename + ':latest'], {
        stdio: 'inherit'
    });
    var bind_ip = '';
    if (options.localhost) {
        bind_ip = '127.0.0.1:';
    }
    var daemon_switch = '-d';
    if (options.foreground) {
        daemon_switch = '-it';
    }

    var config_volume = '';
    if (options.configvolume) {
        config_volume = ' -v ' + options.configvolume + ':/var/config';
    }

    var exts_volume = '';
    if (options.extsvolume) {
        exts_volume = ' -v ' + options.extsvolume + ":/root/lx";
    }

    if (options.launch) {
        var args = [];
        args.push('run');
        args.push(daemon_switch);
        args.push('-p');
        args.push(bind_ip + options.tlsport + ':443');
        if (options.configvolume) {
            args.push('-v');
            args.push(options.configvolume + ':/var/config');
        }
        if (options.exts_volume) {
            args.push('-v');
            args.push(options.extsvolume + ':/root/lx');
        }
        args.push(options.imagename + ":latest");
        child_process.execFileSync(
            'docker', args, { stdio: 'inherit' });
        process.stdout.write(colors.yellow(
            '\n\nContainer running at https://localhost:' + options.tlsport + '\n\n'));
    } else {
        process.stdout.write(colors.yellow(
            '\n\nYou can launch your container with the command\n\n'));
        process.stdout.write(colors.cyan(
            'docker run -d ' + config_volume + exts_volume + ' -p ' + bind_ip + options.tlsport + ':443 ' + options.imagename + ":latest"));
        process.stdout.write('\n\n');
    }
};

let list = (val) => {
    return val.split(',');
};

program
    .version('1.0.0')
    .option('-n, --imagename <value>', 'lowercase image name to create (required)')
    .option('-i, --image [value]', 'name of docker image to use to base container image', 'f5devcentral/f5-api-services-gateway:latest')
    .option('--localhost', 'limit access to localhost.')
    .option('--configvolume', 'directory to persist configurations - including trusts', 'none')
    .option('--extsvolume', 'directory to read iControl LX extensions to install', 'none')
    .option('--rpms <items>', 'URLs for iControlLX RPMs to install (comma separated)', list)
    .option('--bigips <items>', 'BIG-IPs to trust comma separated list of username:password:mgmt-ip', list)
    .option('--tlsport [n]', 'alternative TLS port to expose', 8443)
    .option('--auth [value]', 'set authorization type to basic or ldap', 'none')
    .option('--user [value]', 'basic auth username.')
    .option('--password [value]', 'basic auth password.')
    .option('--ldapurl [value]', 'LDAP auth URL.')
    .option('--ldapbinddn [value]', 'LDAP auth bind DN.')
    .option('--ldapbindpassword [value]', 'LDAP auth bind password.')
    .option('--authincontainer', 'copy authorization settings into container')
    .option('--launch', 'launch a container from the image built')
    .option('--foreground', 'keep the lauched gateway in the terminal foreground');

program.on('--help', () => {
    console.log(`
Examples:

        node f5-asg-builder.js  
            -n bigip_gateway 
            -i supernetops/f5-apiservices-gateway:latest 
            --tlsport 9443 
            --auth basic 
            --user admin 
            --password adminpassword 

        node f5-asg-builder.js 
            --imagename enterprise_pool_deployer 
            --ldapurl ldap://dc1.example.com 
            --ldapbinddn supernetopservice@example.com 
            --ldapbindpassword fF55395f8ba84ffb986490f481628365! 
            --bigips admin:admin:192.168.245.1,admin:admin:192.168.245.2 
            --rpms https://git.example.com/supetnetops/pool_deployer/releases/download/v1.0.0/pool-deployer-1.0.0.noarch.rpm

        node f5-asg-builder.js
            --imagename TrustedASG
            --auth none
            --configvolume ./asgdata
            --rpms https://github.com/F5Networks/f5-declarative-onboarding/releases/download/v1.5.0/f5-declarative-onboarding-1.5.0-11.noarch.rpm,https://github.com/jgruber/TrustedDevices/releases/download/1.3.0.1/TrustedDevices-1.3.0-0004.noarch.rpm,https://github.com/jgruber/TrustedProxy/releases/download/1.0.1.2/TrustedProxy-1.0.1-0004.noarch.rpm,https://github.com/jgruber/TrustedExtensions/releases/download/1.0.1/TrustedExtensions-1.0.1-0001.noarch.rpm,https://github.com/jgruber/TrustedASMPolicies/releases/download/1.0.5/TrustedASMPolicies-1.0.5-0004.noarch.rpm 
    `);
});

if (process.argv.length == 2) {
    process.argv.push('--help');
}

program.parse(process.argv);

createDockerImage(program);
