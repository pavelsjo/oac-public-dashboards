# Parte 2 - Dashboards Públicos

Por defecto `Oracle Analytics Cloud (OAC)` usa una capa de autentificación provista por el `Oracle Identity Cloud Service (IDCS)` y siempre se requiere de autentificación.

Entonces, para disponibilizar contenido público utilizaremos capacidades nativas en la nube que agreguen esta funcionalidad.

Para implementar esta arquitectura se necesitan crear y/o configurar los siguientes componentes:

- Usuario
- App en OIDCS
- Oracle Functions
- Oracle API

## 1. Crear un usuario con pocos privilegios

Para ello debes tener acceso a la consola de Oracle Cloud y buscar en ese orden:

- Menu(Arr. Izquierda) > Identity & Security > Federation

![img](media/identity-1.png)

Luego selecciona el proveedor de Identidad que por defecto es `OracleIdentityCloudService (OICS)`.

![img](media/identity-2.png)

Allí pulsa el boton crear y verás la siguiente pantalla:

![img](media/identity-3.png)

Como puedes ver el usuario que estamos creando es federado, es decir, es un usuario IDCS y solo debes completar los datos minimos requeridos, por lo tanto, luego de hacer click en el boton `create` en la siguiente ventana haz nuevamente click en el boton `close`.

En mi caso el usuario se llama `oac` y para definir la contraseña debes revisar un nuevo mensaje que te habrá llegado al correo que escogiste.

## 2. Crear una app con IDCS.

El siguiente paso será crear una aplicacion para utilizarla como un mecanismo que nos permita la opción de autentificación vía token.

Para ello desde la misma ventana donde creaste tu usuario federado, ahora debes hacer click en el link que te lleva al panel de administrador de OIDCS.

![img](media/app-1.png)

Luego desde la ventana de administración debes seleccionar el icono que está arriba a la izquierda y seleccionar `Applications`.

![img](media/app-2.png)

Selecciona crear una App Confidencial:

![img](media/app-3.png)

En el **1-Details** Selecciona un nombre válido para tu aplicación y dale `next`.

![img](media/app-4.png)

En **2-Client** debes seleccionar `configure this application as a client now` dar permisos como `Resource Owner` y en las políticas de Token seleccionar `Specific` y también dar click en `Add Scope`.

![img](media/app-5.png)

Y en el scope debes buscar tu instancia de OAC, que debe iniciar con `ANALYTICSINST_` más el nombre de tu instancia.

![img](media/app-6.png)

Y así tu instancia quedará registrada:

![img](media/app-7.png)

**Atención** el `Resource` y el `Scope` son datos sensibles y no debes exponerlos públicamente.

Luego, en el **4-Web Tier Policy** solo debes dar en Next.

![img](media/app-8.png)

Y en el **5-Authorization** tampoco debes seleccionar nada y solo haz click en finalizar.

![img](media/app-9.png)

Finalmente te aparecerá una ventana con el `Client ID` y el `Client Secret`.

![img](media/app-10.png)

Estos dos valores son datos que no debes exponer públicamente y debes copiarlos y guardarlos en un lugar seguro antes de cerrar la ventana porque vamos a utilizarlos.

Finalmente en la pestaña donde aparece tu aplicación debes activarla.

![img](media/app-11.png)

## 3. Codificar la credencial de nuestra app con Base 64

Ya que tenemos la aplicación que nos permitirá crear un token, podemos probarla con el siguiente código:

```s
curl --request POST \
 --url https://<IDCS-domain>.identity.oraclecloud.com/oauth2/v1/token \
 --header 'authorization: Basic <base64 encoded clientID:ClientSecret>' \
 --header 'content-type: application/x-www-form-urlencoded;charset=UTF-8' \
-d 'grant_type=password&username=<username>&password=<password>&scope=<scope>'
```

Entonces, para que ese código funcione debes editar los siguientes parámetros:

- **\<IDCS-domain>**: puedes ubicarlo en el link que te lleva al panel de administrador de OIDCS, es la misma ventana donde creaste tu usuario federado.
- **clientID** y **ClientSecret** aparecen al final de la creación de la app. En caso de que no los hayas copiado puedes hacer doble click en la app luego en `configuracion` y `General information` los veras nuevamente, en el caso del **ClientSecret** deberas crear uno nuevo si lo olvidaste.
- **\<username>** y **\<password>**: del usuario con pocos privilegios que creamos en al principio.
- **\<scope>**: En caso de que no los hayas copiado puedes hacer doble click en la app luego en `configuracion` y `Client Configuration` los veras nuevamente.

Puede que notaste que el **clientID** y **ClientSecret** deben estar en codificados en base 64 y para hacerlo puedes usar la consola de OCI:

![img](media/token-1.png)

Y escribir el siguiente comando `echo -n "clientID:ClientSecret" | base64`:

```shell
echo -n "3be6b04893dd4393bbed9c72ef7f8895:e9d5f2f3-94c1-4c06-a148-9f9aef5ed30a" | base64
```

Que retorna:

```shell
M2JlNmIwNDg5M2RkNDM5M2JiZWQ5YzcyZWY3Zjg4OTU6ZTlkNWYyZjMtOTRjMS00YzA2LWExNDgOWY5YWVmNWVkMzBh
```

Y finalmente tu código debe lucir así:

```shell
curl --request POST \ 
--url https://idcs-28f7aa1618d04f7ab72e708aaf975a7b.identity.oraclecloud.com/oauth2/v1/token \ 
--header 'authorization: Basic M2JlNmIwNDg5M2RkNDM5M2JiZWQ5YzcyZWY3Zjg4OTU6ZTlkNWYyZjMtOTRjMS00YzA2LWExNDgtOWY5YWVmNWVkMzBh' \
--header 'content-type: application/x-www-form-urlencoded;charset=UTF-8' \ 
-d 'grant_type=password&username=oac&password=PASSWORD&scope=https://w32jtlztl3wgffrgahfcx26gqa27dgua.analytics.ocp.oraclecloud.comurn:opc:resource:consumer::all'
```

Al presionar debes ver en la consola un token que expira en 100s:

```shell
{"access_token":"eyJ4NXQjUzI1NiI6ImNmRTg0NUdHeVZZOHMzbTNGZEY1Q3ozNXg0cTFhbDNnbi1TN2psZ05oWTgiLCJ4NXQiOiJFSW43eEFEaTcySGpfQVhCa0FrMldTeXlrSTgiLCJraWQiOiJTSUdOSU5HX0tFWSIsImFsZyI6IlJTMjU2In0.eyJ1c2VyX3R6IjoiQW1lcmljYVwvQ2hpY2FnbyIsInN1YiI6Im9hYyIsInVzZXJfbG9jYWxlIjoiZW4iLCJ1c2VyLnRlbmFudC5uYW1lIjoiaWRjcy0yOGY3YWExNjE4ZDA0ZjdhYjcyZTcwOGFhZjk3NWE3YiIsImlzcyI6Imh0dHBzOlwvXC9pZGVudGl0eS5vcmFjbGVjbG91ZC5jb21cLyIsInVzZXJfdGVuYW50bmFtZSI6ImlkY3MtMjhmN2FhMTYxOGQwNGY3YWI3MmU3MDhhYWY5NzVhN2IiLCJjbGllbnRfaWQiOiIzYmU2YjA0ODkzZGQ0MzkzYmJlZDljNzJlZjdmODg5NSIsInN1Yl90eXBlIjoidXNlciIsInNjb3BlIjoidXJuOm9wYzpyZXNvdXJjZTpjb25zdW1lcjo6YWxsIiwiY2xpZW50X3RlbmFudG5hbWUiOiJpZGNzLTI4ZjdhYTE2MThkMDRmN2FiNzJlNzA4YWFmOTc1YTdiIiwicmVnaW9uX25hbWUiOiJzYS1zYW9wYXVsby1pZGNzLTEiLCJ1c2VyX2xhbmciOiJlbiIsImV4cCI6MTYzMDk3NzU1MywiaWF0IjoxNjMwOTc3NDUzLCJjbGllbnRfZ3VpZCI6IjM0OWU2MDI0MmRjMTRmNmY5OGVhMDJmZTZkNmI0YWQ4IiwiY2xpZW50X25hbWUiOiJPYWNQdWJsaWMiLCJ0ZW5hbnQiOiJpZGNzLTI4ZjdhYTE2MThkMDRmN2FiNzJlNzA4YWFmOTc1YTdiIiwianRpIjoiMTFlYzBmNzk2MTNlNjExNmE4YTI2Zjc5NjlkYjM5ZWUiLCJndHAiOiJybyIsInVzZXJfZGlzcGxheW5hbWUiOiJQYWJsbyBTaWVycmEiLCJzdWJfbWFwcGluZ2F0dHIiOiJ1c2VyTmFtZSIsInByaW1UZW5hbnQiOnRydWUsInRva190eXBlIjoiQVQiLCJjYV9ndWlkIjoiY2FjY3QtYTM4NDhmY2Q1NjYyNGE1ZTg3N2NmOTE0NDE4MmY4MTQiLCJhdWQiOlsiaHR0cHM6XC9cL3czMmp0bHp0bDN3Z2ZmcmdhaGZjeDI2Z3FhMjdkZ3VhLmFuYWx5dGljcy5vY3Aub3JhY2xlY2xvdWQuY29tIiwiaHR0cHM6XC9cL29hYy1ncmdxdm9haHNjdmstZ3IuYW5hbHl0aWNzLm9jcC5vcmFjbGVjbG91ZC5jb20iXSwidXNlcl9pZCI6ImJmYTBmYTMyZGVlNDQ4ZDBiNjNhOWNlODUyYTZkMmQ1IiwidGVuYW50X2lzcyI6Imh0dHBzOlwvXC9pZGNzLTI4ZjdhYTE2MThkMDRmN2FiNzJlNzA4YWFmOTc1YTdiLmlkZW50aXR5Lm9yYWNsZWNsb3VkLmNvbTo0NDMiLCJyZXNvdXJjZV9hcHBfaWQiOiJmMDc4M2EwYjMzYWY0OWQyYjYwNGJmN2UwZGRjYzFiOCJ9.PWjt4VnbO5GBJ4PEOjJNxp7UBBstjgEmdNHq_BS_qHV8dKnqb7_HngRVBTtSECPcYw5kIQOtRooURO3CtRTEohUU36zp7AXuz_FN9vrZRDVUsvmlOXeI2Hz8IXnSeEqnIe_gwPgmTs1pNg4V92lFhZgZZ0N6dX8UG8CpM5l119stvYS2Tm8ckaM9CPF18dOMVIqMvT0gaTLycOdWiHcZIiAOL8CHjGZYTuHiaKZ9otmXj9p23_YT8H2AuxvSBwE6XE_DvBX2oAwRqkXyNK5i6UbaGVYK8DFWryFqprruyVsfY36RCZX-qna3iCW6ED5sIAm_2mD1XO8NiPPohLzdig","token_type":"Bearer","expires_in":100}
```

En este momento podemos volver a nuestro código html y editarlo para que utilize el token que estamos generando para ver los dashboards sin necesidad de autentificación.

**nota:** el usuario llamado `oac` debe tener permisos suficientes en `OAC` para ver el proyecto, entonces, puedes otorgarle en `OAC` permisos de visualizador y el proyecto debe estar en carpetas compartidas.

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
        const token = '<token>';
        const params = ['knockout', 'ojs/ojcore', 'ojs/ojknockout', 'ojs/ojcomposite', 'jet-composites/oracle-dv/loader'];
        requirejs(params, ($, ko, application) => {
            application.setSecurityConfig('token', {tokenAuthFunction:()=> token});
            ko.applyBindings();
        });
    </script>
</html>
```

## 4. Oracle Function para crear un Token

## 5. Crear un Api gateway para invocar nuestra Funcion

## 6. Setup final de la página web