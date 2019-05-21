const rp = require('request-promise');
const $ = require('cheerio');
const puppeteer = require('puppeteer');
/*
function sleep (time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}
var counter = 0;
for (let index = 0; index <= 101; index+=10) {
  sleep(5000).then(() => {
    var subst = '&start=' + index
    var url = 'https://scholar.google.it/scholar?hl=it&as_sdt=0%2C5&q=iot&btnG=' + subst;
    rp(url)
      .then(function(html){
        const risultati = [];
        var ris_len = $('div.gs_ri > h3 > a', html).length;
        counter += ris_len;
        for(i=0; i<ris_len; i++){
          risultati.push($('div.gs_ri > h3 > a', html)[i].attribs.href);
        }

        for(i=0; i<ris_len; i++){
          console.log(risultati[i]);
        }
        console.log('--------------------------------------');
      })
      .catch(function(err){
        //handle error
        console.log(err);
    });  
  });
}
//console.log(counter);
*/
async function getAbstract(url) {
  //sleep(index*10000).then(async () => {
      const browser = await puppeteer.launch({headless: false});
      const page = await browser.newPage();
      await page.goto(url);/*
      await page.waitForSelector('div.tabbody');
      return await page.evaluate(() => {
          const abs = document.getElementsByClassName('tabbody')[0].innerText;
          console.log(abs);
          return abs;
      });*/
  //});
}

let url = 'https://dl.acm.org/citation.cfm?id=544462';
getAbstract(url);