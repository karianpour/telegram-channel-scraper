'use strict';
const massive = require('massive');

const database = {
  connect: async () => {
    this.db = await massive({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      database: process.env.DB_DATABASE,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });
  },

  saveData: async (data, title, date, phone, message_id) => {
    const id = `${phone}-${message_id.toString()}`;

    const result = await this.db.query(
      `insert into melkradar (id, phone, message_id, data, title, date, created_at)
      values ($1, $2, $3, $4, $5, $6, now())
      on conflict (id) do nothing returning id
      `,
      [
        id,
        phone, 
        message_id,
        data,
        title,
        date,
      ]
    );
    return result.length === 0 ? null : result[0].id;
  },

  maxScrappingMessageId: async (phone) => {
    const result = await this.db.query(
      `select max_scrapping_message_id from melkradar_scrapping where phone = $1`,
      [
        phone,
      ]
    );
    return result.length === 0 ? null : result[0].max_scrapping_message_id;
  },

  updateMaxScrappingMessageId: async (phone, max_scrapping_message_id) => {
    const result = await this.db.query(
      `insert into melkradar_scrapping (phone, max_scrapping_message_id) values ($1, $2)
      on conflict on constraint melkradar_scrapping_pkey do update set max_scrapping_message_id = $2`,
      [
        phone,
        max_scrapping_message_id,
      ]
    );
    return result.length === 0 ? null : result[0].max_scrapping_message_id;
  },
}

module.exports = {
  database
}

/*
create table melkradar_scrapping (phone text primary key, max_scrapping_message_id int);

create table melkradar (id text primary key, phone text, message_id int, title text, data text, date int, created_at timestamptz);

*/


