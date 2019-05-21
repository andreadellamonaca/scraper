const rp = require('request-promise');
const $ = require('cheerio');
const puppeteer = require('puppeteer');
let url = 'https://dl.acm.org/results.cfm?query=remote+laboratory&Go.x=14&Go.y=15';
let next = '&start=';
const db = require("./dbConnection");
const autoreModel = require('./query/queries_autore');
const articoloModel = require('./query/queries_articolo');
const scrittodaModel = require('./query/queries_scrittoda');
const relativoaModel = require('./query/queries_relativoa');
const giornaleModel = require('./query/queries_giornale');
const conferenzaModel = require('./query/queries_conferenza');
const presenteinModel = require('./query/queries_presentein');
const parolachiaveModel = require('./query/queries_parolachiave');

function sleep (time) {
    return new Promise((resolve) => setTimeout(resolve, time));
  }

var regex = new RegExp(/[\0\x08\x09\x1a\n\r"'\\\%]/g)
var escaper = function escaper(char){
    var m = ['\\0', '\\x08', '\\x09', '\\x1a', '\\n', '\\r', "'", '"', "\\", '\\\\', "%"];
    var r = ['\\\\0', '\\\\b', '\\\\t', '\\\\z', '\\\\n', '\\\\r', "''", '""', '\\\\', '\\\\\\\\', '\\%'];
    return r[m.indexOf(char)];
};

function delay(i, timer) {
    return new Promise(resolve => setTimeout(resolve, timer*i));
}

async function get(browser, page) {
    for (let index = 0; index < 20; index++) {
        await delay(index, 1000);
        const title = await page.evaluate((num) => {
            return document.getElementsByClassName('title')[num].innerText;
        },index);
        const url = await page.evaluate((num) => {
            return document.getElementsByClassName('title')[num].childNodes[1].href;
        },index);
        const autori = await page.evaluate((num) => {
            return document.getElementsByClassName('authors')[num].innerText.split(', ');
        },index);
        const anno = await page.evaluate((num) => {
            return document.getElementsByClassName('source')[num].innerText.split(' ')[1];
        },index);
        const pub_title = await page.evaluate((num) => {
            return document.getElementsByClassName('source')[num].innerText.split(' ')[2];
        },index);
        const anno_publ = await page.evaluate((num) => {
            let year = document.getElementsByClassName('source')[num].innerText.split(' ')[3];
            if (year.includes('\'')) {
                return "20" + year.replace(/[':]/g,"");
            } else {
                return year;
            }
        },index);
        const keywords = await page.evaluate((num) => {
            let kws = [];
            if (document.getElementsByClassName('details')[num].innerHTML.includes('class="kw"')) {
                let offset = 0;
                for (let i = 0; i < num; i++) {
                    if (!(document.getElementsByClassName('details')[i].innerHTML.includes('class="kw"'))) {
                        offset++;
                    }
                }
                let kws_array = document.getElementsByClassName('kw')[num-offset].innerText.replace('Keywords: ','').split(', ');
                for (let j = 0; j < kws_array.length; j++) {
                    kws.push(kws_array[j]);
                }
            }
            return kws;
        },index);
        const detail = await browser.newPage();
        await detail.goto(url, {waitUntil: 'load', timeout: 0});
        await detail.waitForSelector('div.tabbody', {timeout: 0});
        const abstract = await detail.evaluate(() => {
            return document.getElementsByClassName('tabbody')[0].innerText;
        });
        await detail.close();
        let giornale = new giornaleModel(undefined, pub_title);
        db.query(giornale.getGiornaleByTitolo(), (err, data) => {
            if (data.length == 0) {
                let conferenza = new conferenzaModel(undefined, pub_title, "assente", anno_publ);
                db.query(conferenza.getConferenzaByNome(), (err, data) => {
                    if (data.length == 0) {
                        let articolo = new articoloModel(undefined, title.replace(regex, escaper), abstract.replace(regex, escaper), "", "assente", "mancante", anno, 2, 1);
                        db.query(articolo.saveNew(), (err, data) => {
                            if(err) {console.log(index +', Salvataggio articolo: '+err);}
                            if(!err) {
                                db.query(articolo.getArticoloByTitolo_Anno(), (err, data) => {
                                    if(!err) {
                                        let presente = new presenteinModel(data[0].idArticolo, 6, url);
                                        db.query(presente.save(), (err, data) => {
                                            if(err) {console.log(index +', Salvataggio Articolo-repo: '+err);}
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
                                    for (let j = 0; j < keywords.length; j++) {
                                        let keyword = new parolachiaveModel(undefined, keywords[j]);
                                        db.query(keyword.saveNew(), (err, data) => {
                                            if(err) {console.log(index +', Salvataggio keyword: '+err);}
                                            if (!err) {
                                                //console.log('keyword salvata');
                                                db.query(keyword.getParolaChiaveByTermine(), (err, data) => {
                                                    if (!err) {
                                                        let art_kw = new relativoaModel(idarticolo, data[0].idParolaChiave);
                                                        db.query(art_kw.save(), (err, data) => {
                                                            if(err) {console.log(index +', Salvataggio Articolo-kw: '+err);}
                                                            if(!err) {
                                                                //console.log('Articolo-kw salvato');
                                                            }
                                                        });
                                                    }
                                                });
                                            }
                                        });
                                    }
                                    for (let i = 0; i < autori.length; i++) {
                                        let autore = new autoreModel(undefined, autori[i]);
                                        db.query(autore.saveNew(), (err, data)=> {
                                            if(err) {console.log(i +', Salvataggio autore: '+err);}
                                            if(!err) {
                                                let idautore = [];
                                                if (data.insertId == 0) {
                                                    db.query(autore.getAutoreByNomeCompleto(), (err, data)=> {
                                                        if(!err) {
                                                            idautore = data[0].idAutore;
                                                            let scrittoda = new scrittodaModel(idautore, idarticolo);
                                                            db.query(scrittoda.save(), (err, data)=> {
                                                                if(err){ console.log(i +', Salvataggio relazione scrittoda: '+err);}
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
                                                        if(err){ console.log(i +', Salvataggio relazione scrittoda: '+err);}
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
                    } else {
                        let articolo = new articoloModel(undefined, title.replace(regex, escaper), abstract.replace(regex, escaper), "", "assente", "mancante", anno, data[0].idConferenza, 1);
                        db.query(articolo.saveNew(), (err, data) => {
                            if(err) {console.log(index +', Salvataggio articolo: '+err);}
                            if(!err) {
                                db.query(articolo.getArticoloByTitolo_Anno(), (err, data) => {
                                    if(!err) {
                                        let presente = new presenteinModel(data[0].idArticolo, 6, url);
                                        db.query(presente.save(), (err, data) => {
                                            if(err) {console.log(index +', Salvataggio Articolo-repo: '+err);}
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
                                    for (let j = 0; j < keywords.length; j++) {
                                        let keyword = new parolachiaveModel(undefined, keywords[j]);
                                        db.query(keyword.saveNew(), (err, data) => {
                                            if(err) {console.log(index +', Salvataggio keyword: '+err);}
                                            if (!err) {
                                                //console.log('keyword salvata');
                                                db.query(keyword.getParolaChiaveByTermine(), (err, data) => {
                                                    if (!err) {
                                                        let art_kw = new relativoaModel(idarticolo, data[0].idParolaChiave);
                                                        db.query(art_kw.save(), (err, data) => {
                                                            if(err) {console.log(index +', Salvataggio Articolo-kw: '+err);}
                                                            if(!err) {
                                                                //console.log('Articolo-kw salvato');
                                                            }
                                                        });
                                                    }
                                                });
                                            }
                                        });
                                    }
                                    for (let i = 0; i < autori.length; i++) {
                                        let autore = new autoreModel(undefined, autori[i]);
                                        db.query(autore.saveNew(), (err, data)=> {
                                            if(err) {console.log(i +', Salvataggio autore: '+err);}
                                            if(!err) {
                                                let idautore = [];
                                                if (data.insertId == 0) {
                                                    db.query(autore.getAutoreByNomeCompleto(), (err, data)=> {
                                                        if(!err) {
                                                            idautore = data[0].idAutore;
                                                            let scrittoda = new scrittodaModel(idautore, idarticolo);
                                                            db.query(scrittoda.save(), (err, data)=> {
                                                                if(err){ console.log(i +', Salvataggio conferenza relazione scrittoda: '+err);}
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
                                                        if(err){ console.log(i +', Salvataggio conferenza relazione scrittoda: '+err);}
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
                });
            } else {
                let articolo = new articoloModel(undefined, title.replace(regex, escaper), abstract.replace(regex, escaper), "", "assente", "mancante", anno, 2, data[0].idGiornale);
                db.query(articolo.saveNew(), (err, data) => {
                    if(err) {console.log(index +', Salvataggio articolo: '+err);}
                    if(!err) {
                        db.query(articolo.getArticoloByTitolo_Anno(), (err, data) => {
                            if(!err) {
                                let presente = new presenteinModel(data[0].idArticolo, 6, url);
                                db.query(presente.save(), (err, data) => {
                                    if(err) {console.log(index +', Salvataggio Articolo-repo: '+err);}
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
                            for (let j = 0; j < keywords.length; j++) {
                                let keyword = new parolachiaveModel(undefined, keywords[j]);
                                db.query(keyword.saveNew(), (err, data) => {
                                    if(err) {console.log(index +', Salvataggio keyword: '+err);}
                                    if (!err) {
                                        //console.log('keyword salvata');
                                        db.query(keyword.getParolaChiaveByTermine(), (err, data) => {
                                            if (!err) {
                                                let art_kw = new relativoaModel(idarticolo, data[0].idParolaChiave);
                                                db.query(art_kw.save(), (err, data) => {
                                                    if(err) {console.log(index +', Salvataggio Articolo-kw: '+err);}
                                                    if(!err) {
                                                        //console.log('Articolo-kw salvato');
                                                    }
                                                });
                                            }
                                        });
                                    }
                                });
                            }
                            for (let i = 0; i < autori.length; i++) {
                                let autore = new autoreModel(undefined, autori[i]);
                                db.query(autore.saveNew(), (err, data)=> {
                                    if(err) {console.log(i +', Salvataggio autore: '+err);}
                                    if(!err) {
                                        let idautore = [];
                                        if (data.insertId == 0) {
                                            db.query(autore.getAutoreByNomeCompleto(), (err, data)=> {
                                                if(!err) {
                                                    idautore = data[0].idAutore;
                                                    let scrittoda = new scrittodaModel(idautore, idarticolo);
                                                    db.query(scrittoda.save(), (err, data)=> {
                                                        if(err){ console.log(i +', Salvataggio journal relazione scrittoda: '+err);}
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
                                                if(err){ console.log(i +', Salvataggio journal relazione scrittoda: '+err);}
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
        });
    }
}

db.open();
(async () => {
    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();
    for (let res = 0; res < 5; res++) {
        let num_skip = res*20;
        await page.goto(url+skip+num_skip, {waitUntil: 'load', timeout: 0});
        await page.waitForSelector('div.details', {timeout: 0});
        await get(browser, page);
    }
})();