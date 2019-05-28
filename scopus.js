const db = require("./dbConnection");
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var req = new XMLHttpRequest();
let APIKEY = '7f59af901d2d86f78a1fd60c1bf9426a';
const puppeteer = require('puppeteer');
const autoreModel = require('./query/queries_autore');
const articoloModel = require('./query/queries_articolo');
const scrittodaModel = require('./query/queries_scrittoda');
const relativoaModel = require('./query/queries_relativoa');
const giornaleModel = require('./query/queries_giornale');
const conferenzaModel = require('./query/queries_conferenza');
const presenteinModel = require('./query/queries_presentein');
const parolachiaveModel = require('./query/queries_parolachiave');
const citatodaModel = require('./query/queries_citatoda');

var regex = new RegExp(/[\0\x08\x09\x1a\n\r"'\\\%]/g)
var escaper = function escaper(char){
    var m = ['\\0', '\\x08', '\\x09', '\\x1a', '\\n', '\\r', "'", '"', "\\", '\\\\', "%", '\n'];
    var r = ['\\\\0', '\\\\b', '\\\\t', '\\\\z', '\\\\n', '\\\\r', "''", '""', '\\\\', '\\\\\\\\', '\\%', '\\n'];
    return r[m.indexOf(char)];
};

async function getRef(browser, page) {
    let articolo = new articoloModel();
    db.query(articolo.getArticoloFromScopus(), async(err, data) => {
        for (const element of data) {
            console.log(element);
            let art_url = element["URL_Articolo"];
            let idCita = element["idArticolo"];
            await page.goto(art_url, {waitUntil: 'load', timeout: 0});
            const ref_num = await page.evaluate(() => {
                return document.getElementsByClassName('refCont').length;
            });
            for (let j = 0; j < ref_num; j++) {
                let ref_url = await page.evaluate((ind) => {
                    return document.getElementsByClassName('refCont')[ind].childNodes[3].childNodes[1].href;
                }, j);
                if (!(ref_url == undefined)) {
                    let title = await page.evaluate((ind) => {
                        return document.getElementsByClassName('refCont')[ind].childNodes[3].innerText;
                    }, j);
                    let year = await page.evaluate((ind) => {
                        return document.getElementsByClassName('refCont')[ind].childNodes[6].textContent.replace(') ', '').replace('(', '');
                    }, j);
                    const refpage = await browser.newPage();
                    await refpage.goto(ref_url, {waitUntil: 'load', timeout: 0});
                    let pub_title = await refpage.evaluate(() => {
                        if (document.getElementById('publicationTitle') == undefined) {
                            return "None";
                        } else {
                            return document.getElementById('publicationTitle').innerText;   
                        }
                    });
                    let doi = await refpage.evaluate(() => {
                        return document.getElementById('recordDOI').innerText;
                    });
                    let issn = await refpage.evaluate(() => {
                        if (document.getElementById('citationInfo').childNodes[1].innerText.includes('ISSN')) {
                            return document.getElementById('citationInfo').childNodes[1].innerText.replace('ISSN: ', '');
                        } else {
                            return null;
                        }
                    });
                    let isbn = await refpage.evaluate(() => {
                        if (document.getElementById('citationInfo').childNodes[1].innerText.includes('ISBN')) {
                            return document.getElementById('citationInfo').childNodes[1].innerText.replace('ISBN: ', '');
                        } else {
                            if (document.getElementById('citationInfo').childNodes[3].innerText.includes('ISBN')) {
                                return document.getElementById('citationInfo').childNodes[3].innerText.replace('ISBN: ', '');
                            } else {
                                return null;
                            }
                        }
                    });
                    if (issn == null) {
                        issn = "";  
                    }
                    if (isbn == null) {
                        isbn = "";  
                    }
                    let content_type = await refpage.evaluate(() => {
                        return document.getElementById('documentInfo').childNodes[3].innerText.replace('Document Type: ', '');
                    });
        
                    if (content_type.includes('Article')) {
                        let giornale = new giornaleModel(undefined, pub_title);   
                        db.query(giornale.saveNew(), (err, data) => {
                            if(err) {console.log(index +', Salvataggio giornale: '+err);}
                            if(!err) {
                                db.query(giornale.getGiornaleByTitolo(), (err, data)=> {
                                    if(!err) {
                                        let idgiornale = data[0].idGiornale;
                                        let articolo = new articoloModel(undefined, title, "", doi, issn, isbn, year, 1, idgiornale);
                                        db.query(articolo.saveNew(), (err, data) => {
                                            if(err) {console.log(index +', Salvataggio articolo: '+err);}
                                            if(!err) {
                                                db.query(articolo.getArticoloByTitolo_Anno(), (err, data) => {
                                                    if(!err) {
                                                        let presente = new presenteinModel(data[0].idArticolo, 4, ref_url);
                                                        db.query(presente.save(), (err, data) => {
                                                            if(err) {console.log(index +', Salvataggio Articolo-repo: '+err);}
                                                            if(!err) {
                                                                //console.log('Articolo-repo salvato');
                                                            }
                                                        });
                                                        let relazione = new citatodaModel(idCita, data[0].idArticolo);
                                                        db.query(relazione.save(), (err, data) => {
                                                            if(err) {console.log(err);}
                                                            if(!err) {
                                                                console.log('relazione salvata');
                                                            }
                                                        });
                                                    }
                                                });
                                                if (data.insertId == 0) {
                                                    console.log('articolo esistente');
                                                } else {
                                                    let idarticolo = data.insertId;
                                                    (async () => {
                                                        await getAutori_KW(browser, ref_url, idarticolo);
                                                    })();
                                                }
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    } else if(content_type.includes('Conference')){
                        let conferenza = new conferenzaModel(undefined, pub_title, "", "");
                        db.query(conferenza.saveNew(), (err, data) => {
                            if(err) {console.log(index +', Salvataggio conferenza: '+err);}
                            if(!err) {
                                db.query(conferenza.getConferenzaByNome(), (err, data)=> {
                                    if(!err) {
                                        let idconferenza = data[0].idConferenza;
                                        let articolo = new articoloModel(undefined, title, "", doi, issn, isbn, year, idconferenza, 1);
                                        db.query(articolo.saveNew(), (err, data) => {
                                            if(err) {console.log(index +', Salvataggio articolo: '+err);}
                                            if(!err) {
                                                db.query(articolo.getArticoloByTitolo_Anno(), (err, data) => {
                                                    if(!err) {
                                                        let presente = new presenteinModel(data[0].idArticolo, 4, ref_url);
                                                        db.query(presente.save(), (err, data) => {
                                                            if(err) {console.log(index +', Salvataggio Articolo-repo: '+err);}
                                                            if(!err) {
                                                                //console.log('Articolo-repo salvato');
                                                            }
                                                        });
                                                        let relazione = new citatodaModel(idCita, data[0].idArticolo);
                                                        db.query(relazione.save(), (err, data) => {
                                                            if(err) {console.log(err);}
                                                            if(!err) {
                                                                console.log('relazione salvata');
                                                            }
                                                        });
                                                    }
                                                });
                                                if (data.insertId == 0) {
                                                    console.log('articolo esistente');
                                                } else {
                                                    let idarticolo = data.insertId;
                                                    (async () => {
                                                        await getAutori_KW(browser, ref_url, idarticolo);
                                                    })();
                                                }
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                }
                
            } 
        }
    });
    
}

async function getAutori_KW(browser, art_url, idarticolo) {
    
    const page = await browser.newPage();
    await page.goto(art_url, {waitUntil: 'load', timeout: 0});
    const num_aut = await page.evaluate(() => {
        if (document.getElementsByClassName('previewTxt').length == 0) {
            return document.getElementById('authorlist').getElementsByClassName('anchorText').length;
        }
        return document.getElementsByClassName('previewTxt').length - 1;
    });
    for (let index = 0; index < num_aut; index++) {
        const autore = await page.evaluate((i) => {
            if (document.getElementsByClassName('previewTxt').length == 0) {
                return document.getElementById('authorlist').getElementsByClassName('anchorText')[i].childNodes[0].textContent.replace(',', '').split(' ').reverse().join(' ');
            }
            let txt = document.getElementsByClassName('previewTxt')[i].innerText.split(', ').reverse().join(' ');
            return txt;
        }, index);
        let author = new autoreModel(undefined, autore.replace(regex, escaper));
        db.query(author.saveNew(), (err, data)=> {
            if(err) {console.log(index +', Salvataggio autore: '+err);}
            if(!err) {
                let idautore = [];
                if (data.insertId == 0) {
                    db.query(author.getAutoreByNomeCompleto(), (err, data)=> {
                        if(!err) {
                            idautore = data[0].idAutore;
                            let scrittoda = new scrittodaModel(idautore, idarticolo);
                            db.query(scrittoda.save(), (err, data)=> {
                                if(err){ console.log(index +', Salvataggio journal relazione scrittoda: '+err);}
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
                        if(err){ console.log(index +', Salvataggio journal relazione scrittoda: '+err);}
                        if(!err) {
                            console.log('Salvato');
                        }
                    });
                }
            }
        });
    }
  
    const kw_length = await page.evaluate(() => {
      return document.getElementById('indexedKeywords').getElementsByClassName('badges').length;
    });
    for (let ind = 0; ind < kw_length; ind++) {
        const kw = await page.evaluate((i) => {
            return document.getElementById('indexedKeywords').getElementsByClassName('badges')[i].innerText;
        }, ind);
        let keyword = new parolachiaveModel(undefined, kw);
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
    const abstract = await page.evaluate(() => {
        return document.getElementById('abstractSection').childNodes[3].innerText;
    });
    let articolo = new articoloModel(idarticolo, '', abstract.replace(regex, escaper), '', '', '', '', '', '');
    db.query(articolo.saveabstract(), (err, data) => {
        if (err) {
            console.log(err);
        }
        if (!err) {
            console.log('Abstract salvato');
        }
    });
    await page.close();
}


async function processRequest(e) {
    if (req.readyState == 4 && req.status == 200) {
        const browser = await puppeteer.launch({headless: false});
        var response = JSON.parse(req.responseText)["search-results"]["entry"];
        for (let index = 0; index < 10/*response.length*/; index++) {
            const element = response[index];
            let title = element["dc:title"].replace(regex, escaper);
            let year = element["prism:coverDate"].split("-")[0];
            let pub_title = element["prism:publicationName"];
            let doi = element["prism:doi"];
            if (element["prism:issn"] == null) {
                issn = "";  
            } else {
                issn = element["prism:issn"];
            }
            let isbn;
            if (element["prism:isbn"] == null) {
                isbn = "";  
            } else {
                isbn = element["prism:isbn"][0]["$"];
            }
            let content_type = element["subtypeDescription"];
            if (content_type.includes('Article')) {
                let giornale = new giornaleModel(undefined, pub_title);
                db.query(giornale.saveNew(), (err, data) => {
                    if(err) {console.log(index +', Salvataggio giornale: '+err);}
                    if(!err) {
                        db.query(giornale.getGiornaleByTitolo(), (err, data)=> {
                            if(!err) {
                                let idgiornale = data[0].idGiornale;
                                let articolo = new articoloModel(undefined, title, "", doi, issn, isbn, year, 1, idgiornale);
                                db.query(articolo.saveNew(), (err, data) => {
                                    if(err) {console.log(index +', Salvataggio articolo: '+err);}
                                    if(!err) {
                                        let url = element.link[2]["@href"];
                                        db.query(articolo.getArticoloByTitolo_Anno(), (err, data) => {
                                            if(!err) {
                                                let presente = new presenteinModel(data[0].idArticolo, 4, url);
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
                                            (async () => {
                                                await getAutori_KW(browser, url, idarticolo);
                                            })();
                                        }
                                    }
                                });
                            }
                        });
                    }
                });
            } else if(content_type.includes('Conference')){
                let conferenza = new conferenzaModel(undefined, pub_title, "", "");
                db.query(conferenza.saveNew(), (err, data) => {
                    if(err) {console.log(index +', Salvataggio conferenza: '+err);}
                    if(!err) {
                        db.query(conferenza.getConferenzaByNome(), (err, data)=> {
                            if(!err) {
                                let idconferenza = data[0].idConferenza;
                                let articolo = new articoloModel(undefined, title, "", doi, issn, isbn, year, idconferenza, 1);
                                db.query(articolo.saveNew(), (err, data) => {
                                    if(err) {console.log(index +', Salvataggio articolo: '+err);}
                                    if(!err) {
                                        let url = element.link[2]["@href"];
                                        db.query(articolo.getArticoloByTitolo_Anno(), (err, data) => {
                                            if(!err) {
                                                let presente = new presenteinModel(data[0].idArticolo, 4, url);
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
                                            (async () => {
                                                await getAutori_KW(browser, url, idarticolo);
                                            })();
                                        }
                                    }
                                });
                            }
                        });
                    }
                });
            }
        }
    }
}

//1a fase

const apiurl = 'https://api.elsevier.com/content/search/scopus?query=remote%20laboratory&apiKey='+APIKEY;
db.open();
req.open('GET', apiurl, true);
req.send();
req.onreadystatechange = processRequest;
/*

//2a fase

db.open();
(async () => {
    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();
    await getRef(browser, page);
})();*/