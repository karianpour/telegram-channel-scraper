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

  saveData: async (data, title, date, chat_id, message_id) => {
    const id = `${chat_id.toString()}-${message_id.toString()}`;

    const result = await this.db.query(
      `insert into mellat (id, chat_id, message_id, data, title, date, created_at)
      values ($1, $2, $3, $4, $5, $6, now())
      on conflict (id) do nothing returning id
      `,
      [
        id,
        chat_id, 
        message_id,
        data,
        title,
        date,
      ]
    );
    return result.length === 0 ? null : result[0].id;
  },

  maxScrappingMessageId: async (chat_id) => {
    const result = await this.db.query(
      `select max_scrapping_message_id from mellat_scrapping where chat_id = $1`,
      [
        chat_id,
      ]
    );
    return result.length === 0 ? null : result[0].max_scrapping_message_id;
  },

  updateMaxScrappingMessageId: async (chat_id, max_scrapping_message_id) => {
    const result = await this.db.query(
      `insert into mellat_scrapping (chat_id, max_scrapping_message_id) values ($1, $2)
      on conflict on constraint mellat_scrapping_pkey do update set max_scrapping_message_id = $2`,
      [
        chat_id,
        max_scrapping_message_id,
      ]
    );
    return result.length === 0 ? null : result[0].max_scrapping_message_id;
  },

  doWeHaveIt: async (id) => {
    const result = await this.db.query(
      `select id from kashano where id = $1`,
      [
        id.toString(),
      ]
    );
    return !!result && result.length > 0;
  },

  readList: async (lastDate) => {
    const result = await this.db.query(
      `
      select id,
        'دیوار' as source,
        (regexp_matches(data, 'اجاره پارتمان'))[1] as type,
        (regexp_matches(data, 'محل آگهی=([^\n]*)'))[1] as hood,
        title,
        data,
        created_at
      from mellat
      where data ilike '%www.divar.ir%'
        and data ilike '%اجاره پارتمان%'
        and created_at > $1

      union all

      select id,
        'دیوار' as source,
        (regexp_matches(data, 'فروش پارتمان'))[1] as type,
        (regexp_matches(data, 'محل آگهی=([^\n]*)'))[1] as hood,
        title,
        data,
        created_at
      from mellat
      where data ilike '%www.divar.ir%'
        and data ilike '%فروش پارتمان%'
        and created_at > $1
        
      union all

      select id,
        'شیپور' as source,
        (regexp_matches(data, 'اجاره آپارتمان'))[1] as type,
        (regexp_matches(data, 'محل آگهی=([^\n]*)'))[1] as hood,
        title,
        data,
        created_at
      from mellat
      where data ilike '%www.sheypoor.com%'
        and data ilike '%اجاره آپارتمان%'
        and created_at > $1

      union all

      select id,
        'شیپور' as source,
        (regexp_matches(data, 'فروش آپارتمان'))[1] as type,
        (regexp_matches(data, 'محل آگهی=([^\n]*)'))[1] as hood,
        title,
        data,
        created_at
      from mellat
      where data ilike '%www.sheypoor.com%'
        and data ilike '%فروش آپارتمان%'
        and created_at > $1

      order by created_at desc
      `,
      [
        lastDate,
      ]
    );
    return result;
  },
}


module.exports = {
  database
}

/*
create table mellat_scrapping (chat_id int primary key, max_scrapping_message_id int);

create table mellat (id text primary key, chat_id int, message_id int, title text, data text, date int, created_at timestamptz);

*/

/*

copy (
select id,
  data->>'area' as area,
  data->>'name' as name,
  data->>'phone' as phone,
  data->>'owner_name' as owner_name,
  data->>'owner_phone' as owner_phone,
  data->>'price' as price,
  data->>'addr_area' as addr_area,
  data->>'est_address' as est_address,
  data->>'dscr' as dscr,
  data->>'ctime' as ctime,
  (data->>'addr_latitude') || ',' || (data->>'addr_longitude') as location,
  'https://www.openstreetmap.org/search?query=' || (data->>'addr_latitude') || '%2C' || (data->>'addr_longitude') ||'#map=15/' || (data->>'addr_latitude') || '/' || (data->>'addr_longitude'),
  created_at
from kashano
--where id = '1039244'
where created_at > ''2019-02-07 17:12:21.13249+03:30'
--  and region = '5'
order by created_at desc
) to '/home/kayvan/sql/kashano-1397-11-19.csv' with csv header delimiter E'\t';

scp kayvan@crl1:/home/kayvan/sql/kashano-1397-11-19.csv ~/sql


*/

