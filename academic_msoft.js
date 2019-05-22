const rp = require('request-promise');
const $ = require('cheerio');
const puppeteer = require('puppeteer');
const db = require("./dbConnection");
const autoreModel = require('./query/queries_autore');
const articoloModel = require('./query/queries_articolo');
const scrittodaModel = require('./query/queries_scrittoda');
const relativoaModel = require('./query/queries_relativoa');
const giornaleModel = require('./query/queries_giornale');
const conferenzaModel = require('./query/queries_conferenza');
const presenteinModel = require('./query/queries_presentein');
const parolachiaveModel = require('./query/queries_parolachiave');
const citatodaModel = require('./query/queries_citatoda');
const organizzazioneModel = require('./query/queries_organizzazione');
const affiliatoaModel = require('./query/queries_affiliatoa');

let url = 'https://academic.microsoft.com/search?q=remote%20laboratory&qe=%40%40%40Composite(F.FN%3D%3D%27remote%20laboratory%27)&f=&orderBy=0&take=1000&skip=';


var regex = new RegExp(/[\0\x08\x09\x1a\n\r"'\\\%]/g)
var escaper = function escaper(char){
    var m = ['\\0', '\\x08', '\\x09', '\\x1a', '\\n', '\\r', "'", '"', "\\", '\\\\', "%"];
    var r = ['\\\\0', '\\\\b', '\\\\t', '\\\\z', '\\\\n', '\\\\r', "''", '""', '\\\\', '\\\\\\\\', '\\%'];
    return r[m.indexOf(char)];
};

function delay(i, timer) {
    return new Promise(resolve => setTimeout(resolve, timer*i));
}

async function getRefData(page, idCita) {
    await page.evaluate(() => {
        let abst_click = document.getElementsByClassName('au-target icon-down');
        if (abst_click.length < 12) {
            for (let k = 0; k < abst_click.length-1; k++) {
                abst_click[1+k].click();
            }    
        } else {
            for (let k = 0; k < abst_click.length-7; k++) {
                abst_click[8+k].click();
            }
        }
    });
    const res = await page.evaluate(() => {
        return document.getElementsByClassName('paper').length;
    });
    for (let index = 0; index < res-1; index++) {
        await delay(index, 1000);
        const title = await page.evaluate((num) => {
            return document.getElementsByClassName('title au-target')[num].innerText;
        },index);
        if (!(title.includes('[book]'))) {
            const doc_url = await page.evaluate((num) => {
                return document.getElementsByClassName('title au-target')[num].href;
            },index);
            const year = await page.evaluate((num) => {
                return document.getElementsByClassName('publication au-target')[num].innerText.split(' ')[0];
            },index+1);
            const pub_title = await page.evaluate((num) => {
                return document.getElementsByClassName('publication au-target')[num].innerText.replace(/([0-9])/g, "").replace(' ', '');
            },index);
            const autori = await page.evaluate((num) => {
                const a_list = document.getElementsByTagName('ma-author-string-collection')[num].getElementsByClassName('author-item');
                let aut_list = [];
                for (let i = 0; i < a_list.length; i++) {
                    aut_list.push(a_list[i].innerText.replace(',',''));
                }
                return aut_list;
            },index+1);
            const organizzazioni = await page.evaluate((num) => {
                let orgs = [];
                if (document.getElementsByClassName('paper')[num].innerHTML.includes('class="institutions"')) {
                    let offset = 0;
                    for (let i = 0; i < num; i++) {
                        if (!(document.getElementsByClassName('results')[1].innerHTML.split('class="paper"')[i+1].includes('class="institutions"'))) {
                            offset++;
                        }
                    }
                    let ist_array = document.getElementsByClassName('institutions')[num-offset].children;
                    for (let j = 0; j < ist_array.length; j++) {
                        orgs.push(ist_array[j].innerText.replace(/([0-9,])/g, ""));
                    }
                }
                return orgs;
            },index);
            const abstract = await page.evaluate((num) => {
                let abstract = document.getElementsByClassName('paper')[num].childNodes[11].innerText;
                if (abstract.length == 0) {
                    abstract = '';
                }
                return abstract;
            },index+1);
            await page.evaluate((num) => {
                let kw_click = document.getElementsByClassName('show-more au-target');
                if (document.getElementsByClassName('tag-cloud')[num+1].innerText.includes('+')){
                    if (kw_click.length < 12) {
                        kw_click[num].click();    
                    } else {
                        kw_click[num+5].click();
                    }
                }
            }, index);
            const keywords = await page.evaluate((num) => {
                const kw_array = document.getElementsByClassName('tag-cloud')[num+1].innerText.split('\n');
                if (document.getElementsByClassName('tag-cloud')[num+1].innerText.includes('LESS')){
                    kw_array.pop();
                }
                return kw_array;
            }, index);

            let giornale = new giornaleModel(undefined, pub_title);
            db.query(giornale.getGiornaleByTitolo(), (err, data) => {
                if (data.length == 0) {
                    let conferenza = new conferenzaModel(undefined, pub_title, "assente", "mancante");
                    db.query(conferenza.getConferenzaByNome(), (err, data) => {
                        if (data.length == 0) {
                            let articolo = new articoloModel(undefined, title.replace(regex, escaper), abstract.replace(regex, escaper), "undefined", "assente", "mancante", year, 2, 1);
                            db.query(articolo.saveNew(), (err, data) => {
                                if(err) {console.log(index +', Salvataggio articolo: '+err);}
                                if(!err) {
                                    db.query(articolo.getArticoloByTitolo_Anno(), (err, data) => {
                                        if(!err) {
                                            let presente = new presenteinModel(data[0].idArticolo, 5, doc_url);
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
                                            let autore = new autoreModel(undefined, autori[i].replace(/([0-9])/g, ""));
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
                                                                if (organizzazioni.length == 1) {
                                                                    let organiz = new organizzazioneModel(undefined, organizzazioni[0], '');
                                                                    db.query(organiz.saveNew(), (err, data)=> {
                                                                        if(err){ console.log(i +', Salvataggio relazione organizzazione: '+err);}
                                                                        if(!err) {
                                                                            console.log('Salvata organizzazione');
                                                                            db.query(organiz.getOrganizzazioneByNome(), (err, data)=> {
                                                                                if(!err) {
                                                                                    let idorg = data[0].idOrganizzazione;
                                                                                    let affiliato = new affiliatoaModel(idautore, idorg);
                                                                                    db.query(affiliato.save(), (err, data)=> {
                                                                                        if(err){ console.log(i +', Salvataggio relazione affiliatoa: '+err);}
                                                                                        if(!err) {
                                                                                            console.log('Salvata org_autore');
                                                                                        }
                                                                                    });
                                                                                }
                                                                            });
                                                                        }
                                                                    });
                                                                } else {
                                                                    let val = parseInt(autori[i].replace(/\D/g, ""), 10);
                                                                    let organiz = new organizzazioneModel(undefined, organizzazioni[val-1], '');
                                                                    db.query(organiz.saveNew(), (err, data)=> {
                                                                        if(err){ console.log(i +', Salvataggio relazione organizzazione: '+err);}
                                                                        if(!err) {
                                                                            console.log('Salvata organizzazione');
                                                                            db.query(organiz.getOrganizzazioneByNome(), (err, data)=> {
                                                                                if(!err) {
                                                                                    let idorg = data[0].idOrganizzazione;
                                                                                    let affiliato = new affiliatoaModel(idautore, idorg);
                                                                                    db.query(affiliato.save(), (err, data)=> {
                                                                                        if(err){ console.log(i +', Salvataggio relazione affiliatoa: '+err);}
                                                                                        if(!err) {
                                                                                            console.log('Salvata org_autore');
                                                                                        }
                                                                                    });
                                                                                }
                                                                            });
                                                                        }
                                                                    });   
                                                                }
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
                                                        if (organizzazioni.length == 1) {
                                                            let organiz = new organizzazioneModel(undefined, organizzazioni[0], '');
                                                            db.query(organiz.saveNew(), (err, data)=> {
                                                                if(err){ console.log(i +', Salvataggio relazione organizzazione: '+err);}
                                                                if(!err) {
                                                                    console.log('Salvata organizzazione');
                                                                    db.query(organiz.getOrganizzazioneByNome(), (err, data)=> {
                                                                        if(!err) {
                                                                            let idorg = data[0].idOrganizzazione;
                                                                            let affiliato = new affiliatoaModel(idautore, idorg);
                                                                            db.query(affiliato.save(), (err, data)=> {
                                                                                if(err){ console.log(i +', Salvataggio relazione affiliatoa: '+err);}
                                                                                if(!err) {
                                                                                    console.log('Salvata org_autore');
                                                                                }
                                                                            });
                                                                        }
                                                                    });
                                                                }
                                                            });
                                                        } else {
                                                            let val = parseInt(autori[i].replace(/\D/g, ""), 10);
                                                            let organiz = new organizzazioneModel(undefined, organizzazioni[val-1], '');
                                                            db.query(organiz.saveNew(), (err, data)=> {
                                                                if(err){ console.log(i +', Salvataggio relazione organizzazione: '+err);}
                                                                if(!err) {
                                                                    console.log('Salvata organizzazione');
                                                                    db.query(organiz.getOrganizzazioneByNome(), (err, data)=> {
                                                                        if(!err) {
                                                                            let idorg = data[0].idOrganizzazione;
                                                                            let affiliato = new affiliatoaModel(idautore, idorg);
                                                                            db.query(affiliato.save(), (err, data)=> {
                                                                                if(err){ console.log(i +', Salvataggio relazione affiliatoa: '+err);}
                                                                                if(!err) {
                                                                                    console.log('Salvata org_autore');
                                                                                }
                                                                            });
                                                                        }
                                                                    });
                                                                }
                                                            });   
                                                        }
                                                    }
                                                }
                                            });
                                        }
                                    }
                                }
                            });
                        } else {
                            let articolo = new articoloModel(undefined, title.replace(regex, escaper), abstract.replace(regex, escaper), "undefined", "assente", "mancante", year, data[0].idConferenza, 1);
                            db.query(articolo.saveNew(), (err, data) => {
                                if(err) {console.log(index +', Salvataggio articolo: '+err);}
                                if(!err) {
                                    db.query(articolo.getArticoloByTitolo_Anno(), (err, data) => {
                                        if(!err) {
                                            let presente = new presenteinModel(data[0].idArticolo, 5, doc_url);
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
                                            let autore = new autoreModel(undefined, autori[i].replace(/([0-9])/g, ""));
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
                                                                if (organizzazioni.length == 1) {
                                                                    let organiz = new organizzazioneModel(undefined, organizzazioni[0], '');
                                                                    db.query(organiz.saveNew(), (err, data)=> {
                                                                        if(err){ console.log(i +', Salvataggio relazione organizzazione: '+err);}
                                                                        if(!err) {
                                                                            console.log('Salvata organizzazione');
                                                                            db.query(organiz.getOrganizzazioneByNome(), (err, data)=> {
                                                                                if(!err) {
                                                                                    let idorg = data[0].idOrganizzazione;
                                                                                    let affiliato = new affiliatoaModel(idautore, idorg);
                                                                                    db.query(affiliato.save(), (err, data)=> {
                                                                                        if(err){ console.log(i +', Salvataggio relazione affiliatoa: '+err);}
                                                                                        if(!err) {
                                                                                            console.log('Salvata org_autore');
                                                                                        }
                                                                                    });
                                                                                }
                                                                            });
                                                                        }
                                                                    });
                                                                } else {
                                                                    let val = parseInt(autori[i].replace(/\D/g, ""), 10);
                                                                    let organiz = new organizzazioneModel(undefined, organizzazioni[val-1], '');
                                                                    db.query(organiz.saveNew(), (err, data)=> {
                                                                        if(err){ console.log(i +', Salvataggio relazione organizzazione: '+err);}
                                                                        if(!err) {
                                                                            console.log('Salvata organizzazione');
                                                                            db.query(organiz.getOrganizzazioneByNome(), (err, data)=> {
                                                                                if(!err) {
                                                                                    let idorg = data[0].idOrganizzazione;
                                                                                    let affiliato = new affiliatoaModel(idautore, idorg);
                                                                                    db.query(affiliato.save(), (err, data)=> {
                                                                                        if(err){ console.log(i +', Salvataggio relazione affiliatoa: '+err);}
                                                                                        if(!err) {
                                                                                            console.log('Salvata org_autore');
                                                                                        }
                                                                                    });
                                                                                }
                                                                            });
                                                                        }
                                                                    });   
                                                                }
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
                                                        if (organizzazioni.length == 1) {
                                                            let organiz = new organizzazioneModel(undefined, organizzazioni[0], '');
                                                            db.query(organiz.saveNew(), (err, data)=> {
                                                                if(err){ console.log(i +', Salvataggio relazione organizzazione: '+err);}
                                                                if(!err) {
                                                                    console.log('Salvata organizzazione');
                                                                    db.query(organiz.getOrganizzazioneByNome(), (err, data)=> {
                                                                        if(!err) {
                                                                            let idorg = data[0].idOrganizzazione;
                                                                            let affiliato = new affiliatoaModel(idautore, idorg);
                                                                            db.query(affiliato.save(), (err, data)=> {
                                                                                if(err){ console.log(i +', Salvataggio relazione affiliatoa: '+err);}
                                                                                if(!err) {
                                                                                    console.log('Salvata org_autore');
                                                                                }
                                                                            });
                                                                        }
                                                                    });
                                                                }
                                                            });
                                                        } else {
                                                            let val = parseInt(autori[i].replace(/\D/g, ""), 10);
                                                            let organiz = new organizzazioneModel(undefined, organizzazioni[val-1], '');
                                                            db.query(organiz.saveNew(), (err, data)=> {
                                                                if(err){ console.log(i +', Salvataggio relazione organizzazione: '+err);}
                                                                if(!err) {
                                                                    console.log('Salvata organizzazione');
                                                                    db.query(organiz.getOrganizzazioneByNome(), (err, data)=> {
                                                                        if(!err) {
                                                                            let idorg = data[0].idOrganizzazione;
                                                                            let affiliato = new affiliatoaModel(idautore, idorg);
                                                                            db.query(affiliato.save(), (err, data)=> {
                                                                                if(err){ console.log(i +', Salvataggio relazione affiliatoa: '+err);}
                                                                                if(!err) {
                                                                                    console.log('Salvata org_autore');
                                                                                }
                                                                            });
                                                                        }
                                                                    });
                                                                }
                                                            });   
                                                        }
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
                    let articolo = new articoloModel(undefined, title.replace(regex, escaper), abstract.replace(regex, escaper), "undefined", "assente", "mancante", year, 2, data[0].idGiornale);
                    db.query(articolo.saveNew(), (err, data) => {
                        if(err) {console.log(index +', Salvataggio articolo: '+err);}
                        if(!err) {
                            db.query(articolo.getArticoloByTitolo_Anno(), (err, data) => {
                                if(!err) {
                                    let presente = new presenteinModel(data[0].idArticolo, 5, doc_url);
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
                                    let autore = new autoreModel(undefined, autori[i].replace(/([0-9])/g, ""));
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
                                                        if (organizzazioni.length == 1) {
                                                            let organiz = new organizzazioneModel(undefined, organizzazioni[0], '');
                                                            db.query(organiz.saveNew(), (err, data)=> {
                                                                if(err){ console.log(i +', Salvataggio relazione organizzazione: '+err);}
                                                                if(!err) {
                                                                    console.log('Salvata organizzazione');
                                                                    db.query(organiz.getOrganizzazioneByNome(), (err, data)=> {
                                                                        if(!err) {
                                                                            let idorg = data[0].idOrganizzazione;
                                                                            let affiliato = new affiliatoaModel(idautore, idorg);
                                                                            db.query(affiliato.save(), (err, data)=> {
                                                                                if(err){ console.log(i +', Salvataggio relazione affiliatoa: '+err);}
                                                                                if(!err) {
                                                                                    console.log('Salvata org_autore');
                                                                                }
                                                                            });
                                                                        }
                                                                    });
                                                                }
                                                            });
                                                        } else {
                                                            let val = parseInt(autori[i].replace(/\D/g, ""), 10);
                                                            let organiz = new organizzazioneModel(undefined, organizzazioni[val-1], '');
                                                            db.query(organiz.saveNew(), (err, data)=> {
                                                                if(err){ console.log(i +', Salvataggio relazione organizzazione: '+err);}
                                                                if(!err) {
                                                                    console.log('Salvata organizzazione');
                                                                    db.query(organiz.getOrganizzazioneByNome(), (err, data)=> {
                                                                        if(!err) {
                                                                            let idorg = data[0].idOrganizzazione;
                                                                            let affiliato = new affiliatoaModel(idautore, idorg);
                                                                            db.query(affiliato.save(), (err, data)=> {
                                                                                if(err){ console.log(i +', Salvataggio relazione affiliatoa: '+err);}
                                                                                if(!err) {
                                                                                    console.log('Salvata org_autore');
                                                                                }
                                                                            });
                                                                        }
                                                                    });
                                                                }
                                                            });   
                                                        }
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
                                                if (organizzazioni.length == 1) {
                                                    let organiz = new organizzazioneModel(undefined, organizzazioni[0], '');
                                                    db.query(organiz.saveNew(), (err, data)=> {
                                                        if(err){ console.log(i +', Salvataggio relazione organizzazione: '+err);}
                                                        if(!err) {
                                                            console.log('Salvata organizzazione');
                                                            db.query(organiz.getOrganizzazioneByNome(), (err, data)=> {
                                                                if(!err) {
                                                                    let idorg = data[0].idOrganizzazione;
                                                                    let affiliato = new affiliatoaModel(idautore, idorg);
                                                                    db.query(affiliato.save(), (err, data)=> {
                                                                        if(err){ console.log(i +', Salvataggio relazione affiliatoa: '+err);}
                                                                        if(!err) {
                                                                            console.log('Salvata org_autore');
                                                                        }
                                                                    });
                                                                }
                                                            });
                                                        }
                                                    });
                                                } else {
                                                    let val = parseInt(autori[i].replace(/\D/g, ""), 10);
                                                    let organiz = new organizzazioneModel(undefined, organizzazioni[val-1], '');
                                                    db.query(organiz.saveNew(), (err, data)=> {
                                                        if(err){ console.log(i +', Salvataggio relazione organizzazione: '+err);}
                                                        if(!err) {
                                                            console.log('Salvata organizzazione');
                                                            db.query(organiz.getOrganizzazioneByNome(), (err, data)=> {
                                                                if(!err) {
                                                                    let idorg = data[0].idOrganizzazione;
                                                                    let affiliato = new affiliatoaModel(idautore, idorg);
                                                                    db.query(affiliato.save(), (err, data)=> {
                                                                        if(err){ console.log(i +', Salvataggio relazione affiliatoa: '+err);}
                                                                        if(!err) {
                                                                            console.log('Salvata org_autore');
                                                                        }
                                                                    });
                                                                }
                                                            });
                                                        }
                                                    });   
                                                }
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
}

async function getRef(page) {
    let articolo = new articoloModel();
    db.query(articolo.getArticoloFromMsoftAcademic(), async(err, data) => {
        for (const element of data) {
            let art_url = element["URL_Articolo"];
            let art_id = element["idArticolo"];
            await page.goto(art_url, {waitUntil: 'load', timeout: 0});
            await page.waitForSelector('div.paper', {timeout: 0});
            const doi = await page.evaluate(() => {
                return document.getElementsByClassName('venueDetails')[0].innerText.split('DOI: ')[1];
            });
            let art = new articoloModel(art_id, '', '', doi, '', '', '', '', '');
            db.query(art.savedoi(), (err, data) => {
                if (!err) {
                    console.log('DOI salvato');
                }
            });
            let next = true;
            while (next) {
                await getRefData(page, art_id);
                page.evaluate(() => {
                    next_page = document.getElementsByClassName('icon-up right au-target');
                    if (next_page.length > 0) {
                        next_page[0].click();
                    } else {
                        next = false;
                    }
                });
                await delay(1, 3000);
            }
        }
    });
}

async function get(page) {
    for (let index = 0; index < 10; index++) {
        await delay(index, 1000);
        const title = await page.evaluate((num) => {
            return document.getElementsByClassName('title au-target')[num].innerText;
        },index);
        const doc_url = await page.evaluate((num) => {
            return document.getElementsByClassName('title au-target')[num].href;
        },index);
        const year = await page.evaluate((num) => {
            return document.getElementsByClassName('publication au-target')[num].innerText.split(' ')[0];
        },index);
        const pub_title = await page.evaluate((num) => {
            return document.getElementsByClassName('publication au-target')[num].innerText.replace(/([0-9])/g, "").replace(' ', '');
        },index);
        const autori = await page.evaluate((num) => {
            const a_list = document.getElementsByTagName('ma-author-string-collection')[num].getElementsByClassName('author-item');
            let aut_list = [];
            for (let i = 0; i < a_list.length; i++) {
                aut_list.push(a_list[i].innerText.replace(',',''));
            }
            return aut_list;
        },index);
        const organizzazioni = await page.evaluate((num) => {
            let orgs = [];
            if (document.getElementsByClassName('paper')[num].innerHTML.includes('class="institutions"')) {
                let offset = 0;
                for (let i = 0; i < num; i++) {
                    if (!(document.getElementsByClassName('results')[1].innerHTML.split('class="paper"')[i+1].includes('class="institutions"'))) {
                        offset++;
                    }
                }
                let ist_array = document.getElementsByClassName('institutions')[num-offset].children;
                for (let j = 0; j < ist_array.length; j++) {
                    orgs.push(ist_array[j].innerText.replace(/([0-9,])/g, ""));
                }
            }
            return orgs;
        },index);
        await page.evaluate(() => {
            let abst_click = document.getElementsByClassName('au-target icon-down');
            if (abst_click.length < 12) {
                abst_click[1].click();    
            } else {
                abst_click[8].click();
            }
        });
        const abstract = await page.evaluate((num) => {
            const abstract = document.getElementsByClassName('ma-expandable-text')[num].innerText;
            if (abstract.length == 0) {
                abstract = 'non presente';
            }
            return abstract;
        },index);
        await page.evaluate((num) => {
            let kw_click = document.getElementsByClassName('show-more au-target');
            if (document.getElementsByClassName('tag-cloud')[num].innerText.includes('+')){
                if (kw_click.length < 12) {
                    kw_click[num].click();    
                } else {
                    kw_click[num+5].click();
                }
            }
        }, index);
        const keywords = await page.evaluate((num) => {
            const kw_array = document.getElementsByClassName('tag-cloud')[num].innerText.split('\n');
            if (document.getElementsByClassName('tag-cloud')[num].innerText.includes('LESS')){
                kw_array.pop();
            }
            return kw_array;
        }, index);
        
        let giornale = new giornaleModel(undefined, pub_title);
        db.query(giornale.getGiornaleByTitolo(), (err, data) => {
            if (data.length == 0) {
                let conferenza = new conferenzaModel(undefined, pub_title, "assente", "mancante");
                db.query(conferenza.getConferenzaByNome(), (err, data) => {
                    if (data.length == 0) {
                        let articolo = new articoloModel(undefined, title.replace(regex, escaper), abstract.replace(regex, escaper), "", "assente", "mancante", year, 2, 1);
                        db.query(articolo.saveNew(), (err, data) => {
                            if(err) {console.log(index +', Salvataggio articolo: '+err);}
                            if(!err) {
                                db.query(articolo.getArticoloByTitolo_Anno(), (err, data) => {
                                    if(!err) {
                                        let presente = new presenteinModel(data[0].idArticolo, 5, doc_url);
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
                                        let autore = new autoreModel(undefined, autori[i].replace(/([0-9])/g, ""));
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
                                                            if (organizzazioni.length == 1) {
                                                                let organiz = new organizzazioneModel(undefined, organizzazioni[0], '');
                                                                db.query(organiz.saveNew(), (err, data)=> {
                                                                    if(err){ console.log(i +', Salvataggio relazione organizzazione: '+err);}
                                                                    if(!err) {
                                                                        console.log('Salvata organizzazione');
                                                                        db.query(organiz.getOrganizzazioneByNome(), (err, data)=> {
                                                                            if(!err) {
                                                                                let idorg = data[0].idOrganizzazione;
                                                                                let affiliato = new affiliatoaModel(idautore, idorg);
                                                                                db.query(affiliato.save(), (err, data)=> {
                                                                                    if(err){ console.log(i +', Salvataggio relazione affiliatoa: '+err);}
                                                                                    if(!err) {
                                                                                        console.log('Salvata org_autore');
                                                                                    }
                                                                                });
                                                                            }
                                                                        });
                                                                    }
                                                                });
                                                            } else {
                                                                let val = parseInt(autori[i].replace(/\D/g, ""), 10);
                                                                let organiz = new organizzazioneModel(undefined, organizzazioni[val-1], '');
                                                                db.query(organiz.saveNew(), (err, data)=> {
                                                                    if(err){ console.log(i +', Salvataggio relazione organizzazione: '+err);}
                                                                    if(!err) {
                                                                        console.log('Salvata organizzazione');
                                                                        db.query(organiz.getOrganizzazioneByNome(), (err, data)=> {
                                                                            if(!err) {
                                                                                let idorg = data[0].idOrganizzazione;
                                                                                let affiliato = new affiliatoaModel(idautore, idorg);
                                                                                db.query(affiliato.save(), (err, data)=> {
                                                                                    if(err){ console.log(i +', Salvataggio relazione affiliatoa: '+err);}
                                                                                    if(!err) {
                                                                                        console.log('Salvata org_autore');
                                                                                    }
                                                                                });
                                                                            }
                                                                        });
                                                                    }
                                                                });   
                                                            }
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
                                                    if (organizzazioni.length == 1) {
                                                        let organiz = new organizzazioneModel(undefined, organizzazioni[0], '');
                                                        db.query(organiz.saveNew(), (err, data)=> {
                                                            if(err){ console.log(i +', Salvataggio relazione organizzazione: '+err);}
                                                            if(!err) {
                                                                console.log('Salvata organizzazione');
                                                                db.query(organiz.getOrganizzazioneByNome(), (err, data)=> {
                                                                    if(!err) {
                                                                        let idorg = data[0].idOrganizzazione;
                                                                        let affiliato = new affiliatoaModel(idautore, idorg);
                                                                        db.query(affiliato.save(), (err, data)=> {
                                                                            if(err){ console.log(i +', Salvataggio relazione affiliatoa: '+err);}
                                                                            if(!err) {
                                                                                console.log('Salvata org_autore');
                                                                            }
                                                                        });
                                                                    }
                                                                });
                                                            }
                                                        });
                                                    } else {
                                                        let val = parseInt(autori[i].replace(/\D/g, ""), 10);
                                                        let organiz = new organizzazioneModel(undefined, organizzazioni[val-1], '');
                                                        db.query(organiz.saveNew(), (err, data)=> {
                                                            if(err){ console.log(i +', Salvataggio relazione organizzazione: '+err);}
                                                            if(!err) {
                                                                console.log('Salvata organizzazione');
                                                                db.query(organiz.getOrganizzazioneByNome(), (err, data)=> {
                                                                    if(!err) {
                                                                        let idorg = data[0].idOrganizzazione;
                                                                        let affiliato = new affiliatoaModel(idautore, idorg);
                                                                        db.query(affiliato.save(), (err, data)=> {
                                                                            if(err){ console.log(i +', Salvataggio relazione affiliatoa: '+err);}
                                                                            if(!err) {
                                                                                console.log('Salvata org_autore');
                                                                            }
                                                                        });
                                                                    }
                                                                });
                                                            }
                                                        });   
                                                    }
                                                }
                                            }
                                        });
                                    }
                                }
                            }
                        });
                    } else {
                        let articolo = new articoloModel(undefined, title.replace(regex, escaper), abstract.replace(regex, escaper), "", "assente", "mancante", year, data[0].idConferenza, 1);
                        db.query(articolo.saveNew(), (err, data) => {
                            if(err) {console.log(index +', Salvataggio articolo: '+err);}
                            if(!err) {
                                db.query(articolo.getArticoloByTitolo_Anno(), (err, data) => {
                                    if(!err) {
                                        let presente = new presenteinModel(data[0].idArticolo, 5, doc_url);
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
                                        let autore = new autoreModel(undefined, autori[i].replace(/([0-9])/g, ""));
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
                                                            if (organizzazioni.length == 1) {
                                                                let organiz = new organizzazioneModel(undefined, organizzazioni[0], '');
                                                                db.query(organiz.saveNew(), (err, data)=> {
                                                                    if(err){ console.log(i +', Salvataggio relazione organizzazione: '+err);}
                                                                    if(!err) {
                                                                        console.log('Salvata organizzazione');
                                                                        db.query(organiz.getOrganizzazioneByNome(), (err, data)=> {
                                                                            if(!err) {
                                                                                let idorg = data[0].idOrganizzazione;
                                                                                let affiliato = new affiliatoaModel(idautore, idorg);
                                                                                db.query(affiliato.save(), (err, data)=> {
                                                                                    if(err){ console.log(i +', Salvataggio relazione affiliatoa: '+err);}
                                                                                    if(!err) {
                                                                                        console.log('Salvata org_autore');
                                                                                    }
                                                                                });
                                                                            }
                                                                        });
                                                                    }
                                                                });
                                                            } else {
                                                                let val = parseInt(autori[i].replace(/\D/g, ""), 10);
                                                                let organiz = new organizzazioneModel(undefined, organizzazioni[val-1], '');
                                                                db.query(organiz.saveNew(), (err, data)=> {
                                                                    if(err){ console.log(i +', Salvataggio relazione organizzazione: '+err);}
                                                                    if(!err) {
                                                                        console.log('Salvata organizzazione');
                                                                        db.query(organiz.getOrganizzazioneByNome(), (err, data)=> {
                                                                            if(!err) {
                                                                                let idorg = data[0].idOrganizzazione;
                                                                                let affiliato = new affiliatoaModel(idautore, idorg);
                                                                                db.query(affiliato.save(), (err, data)=> {
                                                                                    if(err){ console.log(i +', Salvataggio relazione affiliatoa: '+err);}
                                                                                    if(!err) {
                                                                                        console.log('Salvata org_autore');
                                                                                    }
                                                                                });
                                                                            }
                                                                        });
                                                                    }
                                                                });   
                                                            }
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
                                                    if (organizzazioni.length == 1) {
                                                        let organiz = new organizzazioneModel(undefined, organizzazioni[0], '');
                                                        db.query(organiz.saveNew(), (err, data)=> {
                                                            if(err){ console.log(i +', Salvataggio relazione organizzazione: '+err);}
                                                            if(!err) {
                                                                console.log('Salvata organizzazione');
                                                                db.query(organiz.getOrganizzazioneByNome(), (err, data)=> {
                                                                    if(!err) {
                                                                        let idorg = data[0].idOrganizzazione;
                                                                        let affiliato = new affiliatoaModel(idautore, idorg);
                                                                        db.query(affiliato.save(), (err, data)=> {
                                                                            if(err){ console.log(i +', Salvataggio relazione affiliatoa: '+err);}
                                                                            if(!err) {
                                                                                console.log('Salvata org_autore');
                                                                            }
                                                                        });
                                                                    }
                                                                });
                                                            }
                                                        });
                                                    } else {
                                                        let val = parseInt(autori[i].replace(/\D/g, ""), 10);
                                                        let organiz = new organizzazioneModel(undefined, organizzazioni[val-1], '');
                                                        db.query(organiz.saveNew(), (err, data)=> {
                                                            if(err){ console.log(i +', Salvataggio relazione organizzazione: '+err);}
                                                            if(!err) {
                                                                console.log('Salvata organizzazione');
                                                                db.query(organiz.getOrganizzazioneByNome(), (err, data)=> {
                                                                    if(!err) {
                                                                        let idorg = data[0].idOrganizzazione;
                                                                        let affiliato = new affiliatoaModel(idautore, idorg);
                                                                        db.query(affiliato.save(), (err, data)=> {
                                                                            if(err){ console.log(i +', Salvataggio relazione affiliatoa: '+err);}
                                                                            if(!err) {
                                                                                console.log('Salvata org_autore');
                                                                            }
                                                                        });
                                                                    }
                                                                });
                                                            }
                                                        });   
                                                    }
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
                let articolo = new articoloModel(undefined, title.replace(regex, escaper), abstract.replace(regex, escaper), "", "assente", "mancante", year, 2, data[0].idGiornale);
                db.query(articolo.saveNew(), (err, data) => {
                    if(err) {console.log(index +', Salvataggio articolo: '+err);}
                    if(!err) {
                        db.query(articolo.getArticoloByTitolo_Anno(), (err, data) => {
                            if(!err) {
                                let presente = new presenteinModel(data[0].idArticolo, 5, doc_url);
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
                                let autore = new autoreModel(undefined, autori[i].replace(/([0-9])/g, ""));
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
                                                    if (organizzazioni.length == 1) {
                                                        let organiz = new organizzazioneModel(undefined, organizzazioni[0], '');
                                                        db.query(organiz.saveNew(), (err, data)=> {
                                                            if(err){ console.log(i +', Salvataggio relazione organizzazione: '+err);}
                                                            if(!err) {
                                                                console.log('Salvata organizzazione');
                                                                db.query(organiz.getOrganizzazioneByNome(), (err, data)=> {
                                                                    if(!err) {
                                                                        let idorg = data[0].idOrganizzazione;
                                                                        let affiliato = new affiliatoaModel(idautore, idorg);
                                                                        db.query(affiliato.save(), (err, data)=> {
                                                                            if(err){ console.log(i +', Salvataggio relazione affiliatoa: '+err);}
                                                                            if(!err) {
                                                                                console.log('Salvata org_autore');
                                                                            }
                                                                        });
                                                                    }
                                                                });
                                                            }
                                                        });
                                                    } else {
                                                        let val = parseInt(autori[i].replace(/\D/g, ""), 10);
                                                        let organiz = new organizzazioneModel(undefined, organizzazioni[val-1], '');
                                                        db.query(organiz.saveNew(), (err, data)=> {
                                                            if(err){ console.log(i +', Salvataggio relazione organizzazione: '+err);}
                                                            if(!err) {
                                                                console.log('Salvata organizzazione');
                                                                db.query(organiz.getOrganizzazioneByNome(), (err, data)=> {
                                                                    if(!err) {
                                                                        let idorg = data[0].idOrganizzazione;
                                                                        let affiliato = new affiliatoaModel(idautore, idorg);
                                                                        db.query(affiliato.save(), (err, data)=> {
                                                                            if(err){ console.log(i +', Salvataggio relazione affiliatoa: '+err);}
                                                                            if(!err) {
                                                                                console.log('Salvata org_autore');
                                                                            }
                                                                        });
                                                                    }
                                                                });
                                                            }
                                                        });   
                                                    }
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
                                            if (organizzazioni.length == 1) {
                                                let organiz = new organizzazioneModel(undefined, organizzazioni[0], '');
                                                db.query(organiz.saveNew(), (err, data)=> {
                                                    if(err){ console.log(i +', Salvataggio relazione organizzazione: '+err);}
                                                    if(!err) {
                                                        console.log('Salvata organizzazione');
                                                        db.query(organiz.getOrganizzazioneByNome(), (err, data)=> {
                                                            if(!err) {
                                                                let idorg = data[0].idOrganizzazione;
                                                                let affiliato = new affiliatoaModel(idautore, idorg);
                                                                db.query(affiliato.save(), (err, data)=> {
                                                                    if(err){ console.log(i +', Salvataggio relazione affiliatoa: '+err);}
                                                                    if(!err) {
                                                                        console.log('Salvata org_autore');
                                                                    }
                                                                });
                                                            }
                                                        });
                                                    }
                                                });
                                            } else {
                                                let val = parseInt(autori[i].replace(/\D/g, ""), 10);
                                                let organiz = new organizzazioneModel(undefined, organizzazioni[val-1], '');
                                                db.query(organiz.saveNew(), (err, data)=> {
                                                    if(err){ console.log(i +', Salvataggio relazione organizzazione: '+err);}
                                                    if(!err) {
                                                        console.log('Salvata organizzazione');
                                                        db.query(organiz.getOrganizzazioneByNome(), (err, data)=> {
                                                            if(!err) {
                                                                let idorg = data[0].idOrganizzazione;
                                                                let affiliato = new affiliatoaModel(idautore, idorg);
                                                                db.query(affiliato.save(), (err, data)=> {
                                                                    if(err){ console.log(i +', Salvataggio relazione affiliatoa: '+err);}
                                                                    if(!err) {
                                                                        console.log('Salvata org_autore');
                                                                    }
                                                                });
                                                            }
                                                        });
                                                    }
                                                });   
                                            }
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
    const page = await browser.newPage();/*
    //for (let res = 0; res < 5; res++) {
        let res = 0;
        let skip = res*10
        await page.goto(url+skip, {waitUntil: 'load', timeout: 0});
        await page.waitForSelector('div.paper', {timeout: 0});
        await get(page);
    //}
    */await getRef(page);
})();