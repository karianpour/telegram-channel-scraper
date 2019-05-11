
const config = {
  setConfig: (phone, name) => {
    config.telegram = {
            id: process.env.TELEGRAM_APP_ID,
            hash: process.env.TELEGRAM_APP_HASH,
            phone,
            storage: `storage/telegram_${name}.json`,
            devServer: false,
            msgHistory: {
                maxMsg: 100,
                limit: 50,
            },
            getChat: {
                limit: 50
            },
    }

    config.server = process.env.SERVER_URL
  }
};


module.exports = config;