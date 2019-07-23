# f5-asg-builder
## Create an F5 API Services Gateway Docker Image
```
npm install
npm start
```
or
```
npm install 
node f5-asg-builder.js
```
## After install the Usage is as follows:

```
 Usage: node f5-asg-builder.js [options]

  Options:

    -V, --version                output the version number
    -n, --imagename <value>      image name to create (required)
    -i, --image [value]          name of docker image to use to base container image (default: f5devcentral/f5-api-services-gateway:latest)
    --localhost                  limit access to localhost.
    --configvolume               directory to persist configurations - including trusts
    --extsvolume                 directory to read iControl LX extensions to install
    --rpms <items>               URLs for iControlLX RPMs to install
    --tlsport [n]                alternative TLS port to expose (default: 8443)
    --auth [value]               set authorization type to basic or ldap (default: none)
    --user [value]               basic auth username.
    --password [value]           basic auth password.
    --ldapurl [value]            LDAP auth URL.
    --ldapbinddn [value]         LDAP auth bind DN.
    --ldapbindpassword [value]   LDAP auth bind password.
    --authincontainer            copy authorization settings into container
    --bigips <items>             BIG-IPs to trust comma separated list of username:password:mgmt-ip
    --launch                     launch a container from the image built
    --foreground                 keep the launched gateway in the terminal foreground
    -h, --help                   output usage information


Examples:

node f5-asg-builder.js \
    -n bigip_gateway \
    -i supernetops/f5-apiservices-gateway:latest \
    --tlsport 9443 \
    --httpport 9080 \
    --auth basic \
    --user admin \
    --password adminpassword

node f5-asg-builder.js \
    --imagename enterprise_pool_deployer \
    --ldapurl ldap://dc1.example.com \
    --ldapbinddn supernetopservice@example.com \
    --ldapbindpassword fF55395f8ba84ffb986490f481628365! \
    --bigips admin:admin:192.168.245.1,admin:admin:192.168.245.2 \
    --rpms https://git.example.com/supetnetops/pool_deployer/releases/download/v1.0.0/pool-deployer-1.0.0.noarch.rpm

node f5-asg-builder.js
    --imagename TrustedASG
    --auth none
    --configvolume ./asgdata
    --rpms https://github.com/F5Networks/f5-declarative-onboarding/releases/download/v1.5.0/f5-declarative-onboarding-1.5.0-11.noarch.rpm,https://github.com/jgruber/TrustedDevices/releases/download/1.3.0.1/TrustedDevices-1.3.0-0004.noarch.rpm,https://github.com/jgruber/TrustedProxy/releases/download/1.0.1.2/TrustedProxy-1.0.1-0004.noarch.rpm,https://github.com/jgruber/TrustedExtensions/releases/download/1.0.1/TrustedExtensions-1.0.1-0001.noarch.rpm,https://github.com/jgruber/TrustedASMPolicies/releases/download/1.0.5/TrustedASMPolicies-1.0.5-0004.noarch.rpm 


```
