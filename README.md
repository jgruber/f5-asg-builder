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
    --tlsport [n]                alternative TLS port to expose (default: 8443)
    --httpport [n]               alternative HTTP port to expose (default: 8080)
    --auth [value]               set authorization type to basic or ldap (default: none)
    --user [value]               basic auth username.
    --password [value]           basic auth password.
    --ldapurl [value]            LDAP auth URL.
    --ldapbinddn [value]         LDAP auth bind DN.
    --ldapbindpassword [value]   LDAP auth bind password.
    --authincontainer            copy authorization settings into container
    --bigips <items>             BIG-IPs to trust comma separated list of username:password:mgmt-ip
    --rpms <items>               URLs for iControlLX RPMs to install
    --launch                     Launch a container from the image built
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
```
