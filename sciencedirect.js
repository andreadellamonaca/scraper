const db = require("./dbConnection");
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var req = new XMLHttpRequest();
const autoreModel = require('./query/queries_autore');
const articoloModel = require('./query/queries_articolo');
const scrittodaModel = require('./query/queries_scrittoda');
const presenteinModel = require('./query/queries_presentein');
const relativoaModel = require('./query/queries_relativoa');
const parolachiaveModel = require('./query/queries_parolachiave');
let APIKEY = '7f59af901d2d86f78a1fd60c1bf9426a';
const puppeteer = require('puppeteer');

var regex = new RegExp(/[\0\x08\x09\x1a\n\r"'\\\%]/g)
var escaper = function escaper(char){
    var m = ['\\0', '\\x08', '\\x09', '\\x1a', '\\n', '\\r', "'", '"', "\\", '\\\\', "%", '\n'];
    var r = ['\\\\0', '\\\\b', '\\\\t', '\\\\z', '\\\\n', '\\\\r', "''", '""', '\\\\', '\\\\\\\\', '\\%', '\\n'];
    return r[m.indexOf(char)];
};

function getAbstractbyDOI (doi) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      let abstract_ret_url = 'https://api.elsevier.com/content/article/doi/'+doi+'?apiKey='+APIKEY+'&httpAccept=application%2Fjson';
      xhr.open('GET', abstract_ret_url);
      xhr.onreadystatechange = function () {
        if (this.status == 200 && this.readyState == 4) {
            let result = JSON.parse(xhr.responseText);
            resolve(result["full-text-retrieval-response"]["coredata"]["dc:description"]);
        }
      };
      xhr.send();
    });
}


function processRequest(e) {
    if (req.readyState == 4 && req.status == 200) {
        var response = JSON.parse(req.responseText)["search-results"]["entry"];
        for (let index = 0; index < response.length; index++) {
            const element = response[index];
            let doi = element["prism:doi"];
            getAbstractbyDOI(doi).then(function (res) {
                let abstract = res.replace('Abstract', '').replace('               ', '').replace(regex, escaper);
                let title = element["dc:title"].replace(regex, escaper);
                let year = element["prism:coverDate"].split("-")[0];
                let doi = element["prism:doi"];
                let articolo = new articoloModel(undefined, title, abstract, doi, "", "", year, 1, 1);
                db.query(articolo.saveNew(), (err, data) => {
                    if(err) {console.log(index +', Salvataggio articolo: '+err);}
                    if(!err) {
                        let url = element.link[1]["@href"];;
                        db.query(articolo.getArticoloByTitolo_Anno(), (err, data) => {
                            if(!err) {
                                let presente = new presenteinModel(data[0].idArticolo, 3, url);
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
                            let autori = element.authors.author;
                            let a_list = [];
                            if (typeof autori == 'object') {
                                for (let i = 0; i < autori.length; i++) {
                                    a_list.push(autori[i]);
                                }        
                            } else {
                                var autore = {};
                                autore["$"] = autori;
                                a_list.push(autore);
                            }
                            for (let i = 0; i < a_list.length; i++) {
                                let autore = new autoreModel(undefined, a_list[i]["$"].replace(regex, escaper));
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
                                                            console.log('Salvato');
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
            });
        }
    }
}

async function getKW(page) {
    let articolo = new articoloModel();
    db.query(articolo.getArticoloFromSDirect(), async(err, data) => {
        for (const element of data) {
            let art_url = element["URL_Articolo"];
            let art_id = element["idArticolo"];
            await page.goto(art_url, {waitUntil: 'load', timeout: 0});
            //await page.waitForSelector('dl.references', {timeout: 0});
            const kw_array = await page.evaluate(() => {
                let kws = [];
                let num_kws = document.getElementsByClassName('keyword').length;
                for (let i = 0; i < num_kws; i++) {
                    kws.push(document.getElementsByClassName('keyword')[i].innerText);
                }
                return kws;
            });
            console.log(kw_array);
            for (let j = 0; j < kw_array.length; j++) {
                let keyword = new parolachiaveModel(undefined, kw_array[j]);
                db.query(keyword.saveNew(), (err, data) => {
                    if(err) {console.log('Salvataggio keyword: '+err);}
                    if (!err) {
                        //console.log('keyword salvata');
                        db.query(keyword.getParolaChiaveByTermine(), (err, data) => {
                            if (!err) {
                                let art_kw = new relativoaModel(art_id, data[0].idParolaChiave);
                                db.query(art_kw.save(), (err, data) => {
                                    if(err) {console.log('Salvataggio Articolo-kw: '+err);}
                                    if(!err) {
                                        //console.log('Articolo-kw salvato');
                                    }
                                });
                            }
                        });
                    }
                });
            }
        }
    });
}

//1a fase

const apiurl = 'https://api.elsevier.com/content/search/sciencedirect?query=remote%20laboratory&apiKey='+APIKEY+'&count=20';
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
    await getKW(page);
})();*/