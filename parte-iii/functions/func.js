//
// This is SAMPLE CODE illustrating how to obtain a token from IDCS using Oracle Functions service
//
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
        "password": "Oracle123...",
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