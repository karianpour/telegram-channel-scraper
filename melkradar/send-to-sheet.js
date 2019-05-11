'use strict'
require('dotenv').config();

const { database } = require('./data-saver');

const {google} = require('googleapis');
const privatekey = require('../private-key-scrapers.json');
const sheets = google.sheets('v4');
const spreadsheetId = '1lNq4qT3WjdHTpOX8TqgsIrssdee8VD17UCaDWFZqF74';

const jwtClient = new google.auth.JWT(
  privatekey.client_email,
  null,
  privatekey.private_key,
  ['https://www.googleapis.com/auth/spreadsheets']
);

async function main(){
  try{

    await database.connect();
    console.log('Successfully connected to database :D');

    await jwtClient.authorize();

    console.log('Successfully connected to google sheets :D');

    let response;

    response = await sheets.spreadsheets.values.get({
      auth: jwtClient,
      spreadsheetId: spreadsheetId,
      range: `Index!A2:A1000`,
    });

    const indexLastRow = response.data.values ? response.data.values.length-1 : -1;
    const lastDate = indexLastRow === -1 ? new Date('2000-02-23 23:47:42Z') : response.data.values[indexLastRow][0];

    console.log(`reading melkradar list after '${lastDate}'`);
    const list = await database.readList(lastDate);

    if(list.length===0){
      console.log('no data to export!');
      process.exit(0);
      return;
    }

    const headers = [ 'source', 'type', 'hood', 'title', 'data', 'created_at' ];

    const data = list.map( l => headers.map( h => l[h]));
    data.unshift(headers);
    const currentLastDate = new Date(list[0].created_at.getTime() + 1000);

    const sheetName = `Melkradar-${(currentLastDate.toISOString())}`;

    response = await sheets.spreadsheets.batchUpdate({
      auth: jwtClient,
      spreadsheetId: spreadsheetId,
      resource:{
        requests: [{
          addSheet:{
            properties: {
              title: sheetName,
            }
          }
        }]
      }
    });

    response = await sheets.spreadsheets.values.update({
      auth: jwtClient,
      spreadsheetId: spreadsheetId,
      range: `${sheetName}!${toColumnName(1)}${(1).toString()}:${toColumnName(headers.length)}${data.length.toString()}`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: data,
      }
    });

    response = await sheets.spreadsheets.values.update({
      auth: jwtClient,
      spreadsheetId: spreadsheetId,
      range: `Index!A${indexLastRow+3}:A${indexLastRow+3}`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[currentLastDate]],
      }
    });
    console.log('Updated');
    process.exit(0);
  }catch(err){
    console.log('The API returned an error: ' + err);
  }
}

function toColumnName(num) {
  let ret = '';
  for (let a = 1, b = 26; (num -= a) >= 0; a = b, b *= 26) {
    ret = String.fromCharCode(parseInt((num % b) / a) + 65) + ret;
  }
  return ret;
}


main();