require('dotenv').config();
const config = require('../config');

const { database } = require('./data-saver');
const Telegram = require('../utils/telegram');

const phones = [
  {
    phone: '+989368862272',
    name: 'melkradar.1',
  }, {
    phone: '+989058010094',
    name: 'melkradar.2',
  }, {
    phone: '+989018960903',
    name: 'melkradar.3',
  },
];

const onlyLogin = false;

const start = async () => {
  try{
    await database.connect();

    for(let phone of phones){
      console.log(`phone is : ${phone.phone}`);
      config.setConfig(phone.phone, phone.name);

      const telegram = new Telegram()
          
      await telegram.checkLogin();

      if(onlyLogin){
        continue;
      }
  
      do{
        try{
          const dialogs = await runWithTimeout(telegram.client, 'messages.getDialogs', {
            limit: 50,
          }, undefined, 15000);
  
          const dialogToBeScrapped = filterDialog(dialogs);
  
          await readDialogs(dialogToBeScrapped, telegram.client, phone);
          break;
  
        }catch(err){
          console.error(err);
          if(err.message!=='timed out'){
            break;
          }
          console.log('it was timeout, lets try again.')
        }
      }while(true);
    }
  }catch(err){
    console.error(err);
  }
  process.exit(0);
}

const filterDialog = (dialogs) => {

  const user = dialogs.users.find( u => u.first_name === 'ملک رادار تهران مشاور');
  if(!user){
    console.log(`no melradar user were found!`)
  }

  const dialog = dialogs.dialogs.find(dialog => {
    return dialog.peer.user_id === user.id
  })

  return {user, dialog};
}

const readDialogs = async (dialog, telegram, phone) =>{
  const maxScrappingMessageId = await database.maxScrappingMessageId(phone.phone);

  const firstDate = (new Date('2019-02-22 22:33:51.482197+03:30')).getTime() / 1000;

  let offsetId = maxScrappingMessageId ? maxScrappingMessageId : 0;
  const limit = 40;
  let count = 0;

  do {
    let history = await runWithTimeout(telegram, 'messages.getHistory', {
      peer: {
        _: 'inputPeerUser',
        user_id: dialog.user.id,
        access_hash: dialog.user.access_hash
      },
      offset_id: offsetId,
      limit
    }, undefined, 15000);
    let alreadySaved = 0;

    if (history.messages.length > 0) {
      for(let i=0; i<history.messages.length; i++){
        const message_id = history.messages[i].id;
        const data = history.messages[i].message;
        const date = history.messages[i].date;
        const title = dialog.title;
        const result = await database.saveData(data, title, date, phone.phone, message_id);
        if(!result){
          alreadySaved++;
        }else{
          count++;
        }
        // console.log(result);
      }
      offsetId = history.messages[history.messages.length-1].id;
      await database.updateMaxScrappingMessageId(phone.phone, offsetId);
    }
    if(history.messages.length === 0 || alreadySaved >= limit || history.messages[history.messages.length-1].date < firstDate ){
      await database.updateMaxScrappingMessageId(phone.phone, null);
      break;
    }
  } while (true)

  console.log(`scrapped ${count} files`)

}

async function runWithTimeout(telegram, method, params, options, timeout){
  if(!timeout) timeout = 15000;
  return new Promise(function(resolve, reject) {
    telegram(method, params, options).then(result => resolve(result))
    .catch(err => reject(err));
    setTimeout(function() {
        reject(new Error('timed out'));
    }, timeout);
  });
}

start();