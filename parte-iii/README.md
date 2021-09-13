# Automatizar el Token

En esta última parte vamos a automatizar la generación del token usando Oracle Functions y como requisito previo debemos tener un `compartment` y una `Virtual Cloud Network (VCN)` en la cual trabajar y si ya tienes estos componentes definidos, entonces, puedes ir directo al paso 1.

## 0. Setup del compartment y VCN en OCI

Primero, el compartment (compartimiento) es simplemente una forma de agrupar nuestros recursos en la nube, ya que, de esta forma podremos auditar y administrar nuestros recursos. Para crearlo debes ir a:

![img](media/funtions-0.png)

Allí a partir del `compartment root` debes crear un nuevo compartment que en este caso se llama `analytics`.

![img](media/funtions-1.png)

Luego debes ir a crear la VCN:

![img](media/funtions-2.png)

Asegurate de estar en el compartment correcto `analyticsAndFunctions` y puedes usar el `wizard` para crear rápidamente una VCN.

![img](media/funtions-3.png)

En el wizzard debes llenar el campo `VCN name` con el nombre de tu preferencia como por ejemplo `analyticsAndFunctionsVcn` y dejando los demás parámetros por defecto puedes dar click en siguiente y crear.

![img](media/funtions-4.png)

Una vez que esté lista haremos click en `View Virtual Cloud Network` y es un buen momento para editar en `Security List` -> `Default Security List for analyticsAndFunctionsVcn` y crear una nueva regla de ingreso:

- Stateless: No
- Source CIDR: 0.0.0.0/0
- IP Protocol: TCP
- Source Port Range: All
- Destination Port Range: 443

Esta regla será necesaria para que el Gateway que creemos en próximos pasos pueda recibir peticiones.

## 1. Oracle Function para crear un Token

Debemos ir a functions desde la consola de OCI:

![img](media/funtions-5.png)

Allí debemos chequear estar en el compartment correcto `analyticsAndFunctions` y crear una nueva applicación que nosotros llamaremos `tokenapp` y dentro de ella crearemos la función que creará nuestro token y la posicionaremos en la subnet pública de la vcn.

![img](media/funtions-6.png)

Puedes seguir el paso a paso del `Cloud Shell Setup`, tomando como referencia:

```shell
#1 - Haz click para abrir la consola
#2
fn list context
fn use context sa-saopaulo-1
#3
fn update context oracle.compartment-id ocid1.compartment.oc1..aaaaaaaagdzkgwhhrk7ysjfoyi7pz7eygs4rqrqjfccye6zc667rd6rl5bra
#4 cambia el valor de [OCIR-REPO] arbitrariamente
fn update context registry gru.ocir.io/grgqvoahscvk/tokenapprepo
#5 - genera un Auth Token y guardalo en un lugar seguro
#6 -  autentificate con el token
docker login -u 'grgqvoahscvk/oracleidentitycloudservice/pablo.sierra.ocanto@oracle.com' gru.ocir.io
#7
fn list apps
# node & oacfunction  
fn init --runtime node tokenfunction
cd tokenfunction
fn -v deploy --app tokenapp
fn invoke tokenapp tokenfunction
```

En el script anterior definimos `nodejs` como lenguaje de programación y creamos una función llamada `tokenfunction` y hacemos el deploy de nuestra aplicación `tokenapp`, en ese sentido debiste ver un `{"message":"Hello World"}` que se mostró en la pantalla de la consola.

Si en este momento desde la consola usas el comando `ls` verás que se crearon tres archivos dentro de `tokenfunction`:

- func.js
- func.yaml  
- package.json

En el `func.js` estará el código de nuestra función, en el `package.json` estarán las dependencias y el `func.yaml` está unos parámetros que `fn` usa para dockerizar nuestra función.

Si sabes usar `vi` puedes usar el comando `vi funct.js` y verás el siguiente código:

```javascript
const fdk=require('@fnproject/fdk');

fdk.handle(function(input){
  let name = 'World';
  if (input.name) {
    name = input.name;
  }
  console.log('\nInside Node Hello World function')
  return {'message': 'Hello ' + name}
})
```

Ese fue el código que se ejecutó cuando lanzamos el comando `fn invoke tokenapp tokenfunction`, entonces, lo que haremos será sobreescribir ese código para que nos cree un token.

**nota** si no sabes usar `vi` (:c) puedes crear un archivo local en tu pc que se llame `func.js` y luego cargarlo con la opción de la consola. Debes tomar en cuenta que el archivo se cargara en el root por lo que debes moverte usando el comando `..` y luego usar el `mv` para mover el archivo dentro de la carpeta `oacfunction`.

![img](media/funtions-7.png)

El código base para el `func.js` será:

```javascript
// This is SAMPLE CODE illustrating how to obtain a token from IDCS using Oracle Functions service
const fdk=require('@fnproject/fdk');
const fetch = require('node-fetch');

fdk.handle(async function(){
    var url ='<URL TO IDCS INSTANCE>';
    var headers = {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "authorization": "Basic <base64 encoded client ID:Client secret>"
    };

    let details = {
        "grant_type": "password",
        "username": "<username>",
        "password": "<password>",
        "scope": "<scope from IDCS confidential application>"
    };
    let formBody = [];
    
    for (let property in details) {
        let encodedKey = encodeURIComponent(property);
        let encodedValue = encodeURIComponent(details[property]);
        formBody.push(encodedKey + "=" + encodedValue);
        console.log(formBody);
    };

    formBody = formBody.join("&");
    console.log(formBody);
    const response = await fetch(url, { method: 'POST', headers: headers, body: formBody});
    const data = response.json();
    
    return data;
});
```

Debes editar los parametros `url`, `headers` y `details` con los mismos datos que usaste para generar el token desde la consola. En nuestro caso queda:

```javascript
// This is SAMPLE CODE illustrating how to obtain a token from IDCS using Oracle Functions service
const fdk=require('@fnproject/fdk');
const fetch = require('node-fetch');

fdk.handle(async function(){
    var url ='https://idcs-28f7aa1618d04f7ab72e708aaf975a7b.identity.oraclecloud.com/oauth2/v1/token';
    var headers = {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "authorization": "Basic M2JlNmIwNDg5M2RkNDM5M2JiZWQ5YzcyZWY3Zjg4OTU6ZTlkNWYyZjMtOTRjMS00YzA2LWExNDgtOWY5YWVmNWVkMzBh"
    };

    let details = {
        "grant_type": "password",
        "username": "oac",
        "password": "!PASSWORD!",
        "scope": "https://w32jtlztl3wgffrgahfcx26gqa27dgua.analytics.ocp.oraclecloud.comurn:opc:resource:consumer::all"
    };
    let formBody = [];
    
    for (let property in details) {
        let encodedKey = encodeURIComponent(property);
        let encodedValue = encodeURIComponent(details[property]);
        formBody.push(encodedKey + "=" + encodedValue);
        console.log(formBody);
    };

    formBody = formBody.join("&");
    console.log(formBody);
    const response = await fetch(url, { method: 'POST', headers: headers, body: formBody});
    const data = response.json();
    
    return data;
});
```

También debes actualizar el `package.json` con las siguientes dependencias:

```json
{
    "name": "oacfunction",
    "version": "1.0.0",
        "description": "Token function",
        "main": "oacfunction.js",
        "author": "",
        "license": "Apache-2.0",
        "dependencies": {
                "@fnproject/fdk": ">=0.0.26",
                "compat": "^1.0.4",
                "cookies": "^0.8.0",
                "extend": "^3.0.2",
                "http-signature": "^1.3.2",
                "node-fetch":"^2.6.0"
        }
}
```

Si tienes dudas, puedes ver un [ejemplo del código](functions/) y cuando termines de actualizar los dos archivos
debes hacer un nuevo deploy:

```shell
fn -v deploy --app tokenapp
```

Y si vuelves a invocar a la función `fn invoke tokenapp tokenfunction` recibirás el token.

## 2. Crear un Api gateway para invocar nuestra Funcion

El siguiente paso sera crear un `END POINT` al cual llamaremos para invocar nuestra función, para ello crearemos un `GATEWAY`:

![img](media/api-1.png)

Posicionados en `Gateway` daremos click en `Create Gateway`, escribiremos un nombre `functionsgateway` seleccionaremos que sea de tipo `Public` y la crearemos en la `Subnet Pública` y le damos crear.

Tardará unos minutos en crearse y cuanto termine iremos a `Deployments`.

![img](media/api-2.png)

En la configuración básica debemos definir un nombre `oac_gateway` y una ruta básica `/V1`para nuestro desarrollo y es importante agregar como dominio seguro `http://127.0.0.1:550` en CORS con el metodo `GET`:

![img](media/api-3.png)

Damos click en siguiente y en Routes, creamos el END POINT para llamar a nuestra función:

![img](media/api-4.png)

Damos click en siguiente y finalizar.

Para que el Gateway pueda invocar Functions agregemos una nueva policy que puedes crear en el compartment `analyticsAndFunctions` en la que debes cambiar `<COMPARTMENT>` y `<OCID>` por tus valores:

```shell
#policy
ALLOW any-user to use functions-family in compartment <COMPARTMENT NAME> where ALL {request.principal.type = 'ApiGateway', request.resource.compartment.id = '<OCID>'}
```

Quedando en nuestro caso:

![img](media/api-5.png)

En este momento puedes copiar el endpoint `https://knooaaqzrwsvychkedrgdlkjzy.apigateway.sa-saopaulo-1.oci.customer-oci.com/v1`:

![img](media/api-6.png)

Y agregarle el `/token` al final y probandolo desde el navegador te devolverá el token:

![img](media/api-7.png)

## 3. Setup final de la página web

Finalmente hacemos un [setup final](final/index.html) de nuestra página:

```html
<!DOCTYPE html>
<html dir="ltr">
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <title>Oracle Analytics Cloud</title>
    </head>
    <body>
        <h1>Oracle Analytics Cloud</h1>
        <div style="position: absolute; width: 100%; height: 100%">
            <!-- dashboards -->
            <oracle-dv project-path="/@Catalog/shared/Sample/Sample Project"></oracle-dv>
        </div>
    </body>
    <script src="https://oac-grgqvoahscvk-gr.analytics.ocp.oraclecloud.com/public/dv/v1/embedding/standalone/embedding.js" type="application/javascript"></script>
    <script>
        var Url = 'https://knooaaqzrwsvychkedrgdlkjzy.apigateway.sa-saopaulo-1.oci.customer-oci.com/v1/token';
        var token_request = new XMLHttpRequest();
        token_request.open("GET", Url, false);
        token_request.send(null);
        if (token_request.status === 200) {
            var idcs_token = JSON.parse(token_request.response).access_token; 
            requirejs(['jquery', 'knockout', 'obitech-application/application', 'ojs/ojcore', 'ojs/ojknockout', 'ojs/ojcomposite', 'jet-composites/oracle-dv/loader'],
                function ($, ko, application) {
                    application.setSecurityConfig("token", {
                        tokenAuthFunction:
                            function () {
                                return idcs_token;
                            }
                    });
                    ko.applyBindings();
                }
            );
        } else {
            console.log(`error ${token_request.status} ${token_request.statusText}`)
        };
    </script>
</html>
```
