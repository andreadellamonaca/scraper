const rp = require('request-promise');
const url = 'https://scholar.google.it/scholar?hl=it&as_sdt=0%2C5&q=remote+laboratory&btnG=';
//const url = 'https://scholar.google.it/scholar?start=10&q=remote+laboratory&hl=it&as_sdt=0,5';
const $ = require('cheerio');
const puppeteer = require('puppeteer');
const db = require("./dbConnection");
const autoreModel = require('./query/queries_autore');
const articoloModel = require('./query/queries_articolo');
const scrittodaModel = require('./query/queries_scrittoda');
const presenteinModel = require('./query/queries_presentein');

var regex = new RegExp(/[\0\x08\x09\x1a\n\r"'\\\%]/g)
var escaper = function escaper(char){
    var m = ['\\0', '\\x08', '\\x09', '\\x1a', '\\n', '\\r', "'", '"', "\\", '\\\\', "%"];
    var r = ['\\\\0', '\\\\b', '\\\\t', '\\\\z', '\\\\n', '\\\\r', "''", '""', '\\\\', '\\\\\\\\', '\\%'];
    return r[m.indexOf(char)];
};

function sleep (time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

async function get(page) {
  for (let i = 0; i < 10; i++) {
    const title = await page.evaluate((num) => {
      return document.getElementsByClassName('gs_rt')[num].innerText;
    },i);
    const year = await page.evaluate((num) => {
      let res = document.getElementsByClassName('gs_a')[num].innerText.split(',');
      return res[res.length-1].split(' -')[0];
    },i);
    const abstract = await page.evaluate((num) => {
      return document.getElementsByClassName('gs_rs')[num].innerText;
    },i);
    const doc_url = await page.evaluate((num) => {
      return document.getElementsByClassName('gs_rt')[0].childNodes[0].href;
    },i);
    await page.evaluate((num) => {
      const elements = document.getElementsByClassName('gs_or_cit gs_nph');
      elements[num].click();
    }, i);
    await page.waitForSelector('div.gs_md_wnw.gs_md_wnw.gs_vis');
    autori = await page.evaluate(() => {
      const authors = [];
      const elements2 = document.getElementsByClassName('gs_citr');
      testo = (elements2)[1].innerText.split('(')[0];
      var autori_string = testo.replace('& ', '').split(',');
      for (let i = 0; i < autori_string.length; i+=2) {
        let aut = autori_string[i].replace(' ', '') + autori_string[i+1];
        authors.push(aut.split(/ (.+)/).reverse().slice(1).join(" ").replace("  ", " "));
      }
      return authors;
    });
    await page.evaluate(() => {
      const element = document.getElementsByClassName('gs_ico')[0];
      element.click();
    });
    console.log(title);
    console.log(year);
    console.log(abstract);
    console.log(doc_url);
    console.log(autori);
    console.log('-------------------');

    let articolo = new articoloModel(undefined, title.replace(regex, escaper), abstract.replace(regex, escaper), "", "assente", "mancante", year, 2, 1);
    db.query(articolo.saveNew(), (err, data) => {
      if(err) {console.log(i +', Salvataggio articolo: '+err);}
      if(!err) {
        db.query(articolo.getArticoloByTitolo_Anno(), (err, data) => {
          if(!err) {
            let presente = new presenteinModel(data[0].idArticolo, 7, doc_url);
            db.query(presente.save(), (err, data) => {
                if(err) {console.log(i +', Salvataggio Articolo-repo: '+err);}
                if(!err) {
                    //console.log('Articolo-repo salvato');
                }
            });
          } 
        });
        if (data.insertId == 0) {
          console.log('articolo esistente');
        } else {
          let idarticolo = data.insertId;
          for (let j = 0; j < autori.length; j++) {
            let autore = new autoreModel(undefined, autori[j]);
            db.query(autore.saveNew(), (err, data)=> {
                if(err) {console.log(j +', Salvataggio autore: '+err);}
                if(!err) {
                  let idautore = [];
                  if (data.insertId == 0) {
                    db.query(autore.getAutoreByNomeCompleto(), (err, data)=> {
                        if(!err) {
                          idautore = data[0].idAutore;
                          let scrittoda = new scrittodaModel(idautore, idarticolo);
                          db.query(scrittoda.save(), (err, data)=> {
                              if(err){ console.log(j +', Salvataggio relazione scrittoda: '+err);}
                              if(!err) {
                                  console.log('Salvato autore');
                              }
                          });
                        }
                    });
                  } else {
                    idautore = data.insertId;
                    let scrittoda = new scrittodaModel(idautore, idarticolo);
                    db.query(scrittoda.save(), (err, data)=> {
                      if(err){ console.log(j +', Salvataggio relazione scrittoda: '+err);}
                      if(!err) {
                          console.log('Salvato');
                      }
                    });
                  }
                }
            });
          }
        }
      }
    });                        
  }
}

db.open();
(async () => {
    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();
    await page.goto(url, {waitUntil: 'load', timeout: 0});
    //await page.waitForSelector('div.paper', {timeout: 0});
    await get(page);
})();