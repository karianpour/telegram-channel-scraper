const { MTProto } = require('telegram-mtproto')
const { Storage } = require('mtproto-storage-fs')
const readline = require('readline')
const appconfig = require('../config')

class Telegram {

  constructor(){
    this.phone = appconfig.telegram.phone
    this.api_id = parseInt(appconfig.telegram.id,10)
    this.api_hash = appconfig.telegram.hash
    this.storage = appconfig.telegram.storage

    const app = {
      storage: new Storage(this.storage)
    }
    this.app = app;
    
    
    const api = {
      layer         : 57,
      initConnection: 0x69796de9,
      api_id        : this.api_id
    }
    
    const server = {
      dev: appconfig.telegram.devServer
    }
    
    this.client = MTProto({ server, api, app })
    
  }

  // First you will receive a code via SMS or Telegram, which you have to enter
  // directly in the command line. If you entered the correct code, you will be
  // logged in and the credentials are saved.
  async login(){
    const { phone_code_hash } = await this.client('auth.sendCode', {
      phone_number  : this.phone,
      sms_type: 5,
      current_number: true,
      api_id        : this.api_id,
      api_hash      : this.api_hash
    })

    const phone_code = await askForCode(this.phone)
    console.log(`Your code: ${phone_code}`)

    const { user } = await this.client('auth.signIn', {
      phone_number   : this.phone,
      phone_code_hash: phone_code_hash,
      phone_code     : phone_code
    })

    console.log('signed as ', user)
  }

  // First check if we are already signed in (if credentials are stored). If we
  // are logged in, execution continues, otherwise the login process begins.
  async checkLogin() {
    let signedin = await this.app.storage.get('signedin');
    if (!signedin) {
      console.log('not signed in')

      try{
        await this.login()

        console.log('signed in successfully')
        this.app.storage.set('signedin', true)
      }catch(err){
        console.error(err);
      }
    } else {
      console.log('already signed in')
    }
    return
  }
}

// This function will stop execution of the program until you enter the code
// that is sent via SMS or Telegram.
const askForCode = (phone) => {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input : process.stdin,
      output: process.stdout
    })

    rl.question('Please enter passcode for ' + phone + ':\n', (num) => {
      rl.close()
      resolve(num)
    })
  })
}


module.exports = Telegram