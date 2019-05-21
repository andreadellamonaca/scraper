var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var req = new XMLHttpRequest();
const db = require("./dbConnection");
const autoreModel = require('./query/queries_autore');
const articoloModel = require('./query/queries_articolo');
const scrittodaModel = require('./query/queries_scrittoda');
const relativoaModel = require('./query/queries_relativoa');
const giornaleModel = require('./query/queries_giornale');
const conferenzaModel = require('./query/queries_conferenza');
const presenteinModel = require('./query/queries_presentein');
const parolachiaveModel = require('./query/queries_parolachiave');
const organizzazioneModel = require('./query/queries_organizzazione');
const affiliatoaModel = require('./query/queries_affiliatoa');
const citatodaModel = require('./query/queries_citatoda');
const rp = require('request-promise');
const $ = require('cheerio');
const puppeteer = require('puppeteer');


var regex = new RegExp(/[\0\x08\x09\x1a\n\r"'\\\%]/g)
var escaper = function escaper(char){
    var m = ['\\0', '\\x08', '\\x09', '\\x1a', '\\n', '\\r', "'", '"', "\\", '\\\\', "%"];
    var r = ['\\\\0', '\\\\b', '\\\\t', '\\\\z', '\\\\n', '\\\\r', "''", '""', '\\\\', '\\\\\\\\', '\\%'];
    return r[m.indexOf(char)];
};

function processRequest(e) {
    if (req.readyState == 4 && req.status == 200) {
        var response = JSON.parse(req.responseText)["articles"];
        for (let index = 0; index < response.length; index++) {
            const element = response[index];
            let title = element["title"].replace(regex, escaper);
            let doi = element["doi"];
            let issn;
            if (element["issn"] == null) {
                issn = "assente";  
            } else {
                issn = element["issn"];
            }
            let isbn;
            if (element["isbn"] == null) {
                isbn = "mancante";  
            } else {
                isbn = element["isbn"];
            }
            let abstract;
            if (element["abstract"] == null) {
                abstract = "non presente";  
            } else {
                abstract = element["abstract"].replace(regex, escaper);
            }
            let year = element["publication_year"];
            let content_type = element["content_type"];
            let pub_title = element["publication_title"].replace(regex, escaper);
            if (content_type.includes('Journals')) {
                let giornale = new giornaleModel(undefined, pub_title);
                db.query(giornale.saveNew(), (err, data) => {
                    if(err) {console.log(index +', Salvataggio giornale: '+err);}
                    if(!err) {
                        db.query(giornale.getGiornaleByTitolo(), (err, data)=> {
                            if(!err) {
                                let idgiornale = data[0].idGiornale;
                                let articolo = new articoloModel(undefined, title, abstract, doi, issn, isbn, year, 2, idgiornale);
                                db.query(articolo.saveNew(), (err, data) => {
                                    if(err) {console.log(index +', Salvataggio articolo: '+err);}
                                    if(!err) {
                                        let url;
                                        if (element["html_url"] == null) {
                                            if (element["abstract_url"] == null) {
                                                url = element["pdf_url"];
                                            } else {
                                                url = element["abstract_url"];
                                            }    
                                        } else {
                                            url = element["html_url"];
                                        }
                                        db.query(articolo.getArticoloByTitolo_Anno(), (err, data) => {
                                            if(!err) {
                                                let presente = new presenteinModel(data[0].idArticolo, 1, url);
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
                                            if (element["index_terms"]["ieee_terms"] != null) {
                                                let kwords = element["index_terms"]["ieee_terms"]["terms"];
                                                for (let j = 0; j < kwords.length; j++) {
                                                    let keyword = new parolachiaveModel(undefined, kwords[j]);
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
                                            }
                                            let a_list = element["authors"]["authors"];
                                            for (let i = 0; i < a_list.length; i++) {
                                                let autore = new autoreModel(undefined, a_list[i]["full_name"]);
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
                                                                    if (a_list[i]["affiliation"] != null) {
                                                                        let affiliazione = a_list[i]["affiliation"];
                                                                        let nome = affiliazione.split(', ')[0].replace(regex, escaper);
                                                                        let luogo = affiliazione.split(', ').splice(1).join(', ').replace(regex, escaper);
                                                                        let organiz = new organizzazioneModel(undefined, nome, luogo);
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
                                                            if (a_list[i]["affiliation"] != null) {
                                                                let affiliazione = a_list[i]["affiliation"];
                                                                let nome = affiliazione.split(', ')[0].replace(regex, escaper);
                                                                let luogo = affiliazione.split(', ').splice(1).join(', ').replace(regex, escaper);
                                                                let organiz = new organizzazioneModel(undefined, nome, luogo);
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
                });
            } else {
                if (element["conference_location"] == null) {
                    clocation = "";  
                } else {
                    clocation = element["conference_location"].replace(regex, escaper);
                }
                let cdate = element["conference_dates"];
                let conferenza = new conferenzaModel(undefined, pub_title, clocation, cdate);
                db.query(conferenza.saveNew(), (err, data) => {
                    if(err) {console.log(index +', Salvataggio conferenza: '+err);}
                    if(!err) {
                        db.query(conferenza.getConferenzaByNome(), (err, data)=> {
                            if(!err) {
                                let idconferenza = data[0].idConferenza;
                                let articolo = new articoloModel(undefined, title, abstract, doi, issn, isbn, year, idconferenza, 1);
                                db.query(articolo.saveNew(), (err, data) => {
                                    if(err) {console.log(index +', Salvataggio articolo: '+err);}
                                    if(!err) {
                                        let url;
                                        if (element["html_url"] == null) {
                                            if (element["abstract_url"] == null) {
                                                url = element["pdf_url"];
                                            } else {
                                                url = element["abstract_url"];
                                            }    
                                        } else {
                                            url = element["html_url"];
                                        }
                                        db.query(articolo.getArticoloByTitolo_Anno(), (err, data) => {
                                            if(!err) {
                                                let presente = new presenteinModel(data[0].idArticolo, 1, url);
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
                                            if (element["index_terms"]["ieee_terms"] != null) {
                                                let kwords = element["index_terms"]["ieee_terms"]["terms"];
                                                for (let j = 0; j < kwords.length; j++) {
                                                    let keyword = new parolachiaveModel(undefined, kwords[j]);
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
                                            }
                                            let a_list = element["authors"]["authors"];
                                            for (let i = 0; i < a_list.length; i++) {
                                                let autore = new autoreModel(undefined, a_list[i]["full_name"]);
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
                                                                        if(err){ console.log(i +', Salvataggio cofnerence relazione scrittoda: '+err);}
                                                                        if(!err) {
                                                                            console.log('Salvato autore');
                                                                        }
                                                                    });
                                                                    if (a_list[i]["affiliation"] != null) {
                                                                        let affiliazione = a_list[i]["affiliation"];
                                                                        let nome = affiliazione.split(', ')[0].replace(regex, escaper);
                                                                        let luogo = affiliazione.split(', ').splice(1).join(', ').replace(regex, escaper);
                                                                        let organiz = new organizzazioneModel(undefined, nome, luogo);
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
                                                                if(err){ console.log(scrittoda.save());}
                                                                if(!err) {
                                                                    console.log('Salvato');
                                                                }
                                                            });
                                                            if (a_list[i]["affiliation"] != null) {
                                                                let affiliazione = a_list[i]["affiliation"];
                                                                let nome = affiliazione.split(', ')[0].replace(regex, escaper);
                                                                let luogo = affiliazione.split(', ').splice(1).join(', ').replace(regex, escaper);
                                                                let organiz = new organizzazioneModel(undefined, nome, luogo);
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
                });
            }
        }
    }
}

function processArticle(article_number, citaId) {
    return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        let article_ret_url = 'http://ieeexploreapi.ieee.org/api/v1/search/articles?apikey=esvghg4gbrwh36tzev6xumhs&format=json&max_records=25&start_record=1&sort_order=asc&sort_field=article_number&article_number='+article_number;
        xhr.open('GET', article_ret_url);
        xhr.onreadystatechange = function () {
            if (this.status == 200 && this.readyState == 4) {
                var response = JSON.parse(xhr.responseText)["articles"];
                const element = response[0];
                let title = element["title"].replace(regex, escaper);
                let doi = element["doi"];
                let issn;
                if (element["issn"] == null) {
                    issn = "assente";  
                } else {
                    issn = element["issn"];
                }
                let isbn;
                if (element["isbn"] == null) {
                    isbn = "mancante";  
                } else {
                    isbn = element["isbn"];
                }
                let abstract;
                if (element["abstract"] == null) {
                    abstract = "non presente";  
                } else {
                    abstract = element["abstract"].replace(regex, escaper);
                }
                let year = element["publication_year"];
                let content_type = element["content_type"];
                let pub_title = element["publication_title"].replace(regex, escaper);
                if (content_type.includes('Journals')) {
                    let giornale = new giornaleModel(undefined, pub_title);
                    db.query(giornale.saveNew(), (err, data) => {
                        if(err) {console.log('Salvataggio giornale: '+err);}
                        if(!err) {
                            db.query(giornale.getGiornaleByTitolo(), (err, data)=> {
                                if(!err) {
                                    let idgiornale = data[0].idGiornale;
                                    let articolo = new articoloModel(undefined, title, abstract, doi, issn, isbn, year, 2, idgiornale);
                                    db.query(articolo.saveNew(), (err, data) => {
                                        if(err) {console.log('Salvataggio articolo: '+err);}
                                        if(!err) {
                                            let url;
                                            if (element["html_url"] == null) {
                                                if (element["abstract_url"] == null) {
                                                    url = element["pdf_url"];
                                                } else {
                                                    url = element["abstract_url"];
                                                }    
                                            } else {
                                                url = element["html_url"];
                                            }
                                            db.query(articolo.getArticoloByTitolo_Anno(), (err, data) => {
                                                if(!err) {
                                                    let presente = new presenteinModel(data[0].idArticolo, 1, url);
                                                    db.query(presente.save(), (err, data) => {
                                                        if(err) {console.log('Salvataggio Articolo-repo: '+err);}
                                                        if(!err) {
                                                            //console.log('Articolo-repo salvato');
                                                        }
                                                    });
                                                    let citazione = new citatodaModel(citaId,data[0].idArticolo);
                                                    db.query(citazione.save(), (err, data) => {
                                                        if(err) {console.log('Salvataggio citazione: '+err);}
                                                        if(!err) {
                                                            console.log('Citazione salvata');
                                                        }
                                                    });
                                                }
                                            });
                                            if (data.insertId == 0) {
                                                console.log('articolo esistente');
                                            } else {
                                                let idarticolo = data.insertId;
                                                if (element["index_terms"]["ieee_terms"] != null) {
                                                    let kwords = element["index_terms"]["ieee_terms"]["terms"];
                                                    for (let j = 0; j < kwords.length; j++) {
                                                        let keyword = new parolachiaveModel(undefined, kwords[j]);
                                                        db.query(keyword.saveNew(), (err, data) => {
                                                            if(err) {console.log('Salvataggio keyword: '+err);}
                                                            if (!err) {
                                                                //console.log('keyword salvata');
                                                                db.query(keyword.getParolaChiaveByTermine(), (err, data) => {
                                                                    if (!err) {
                                                                        let art_kw = new relativoaModel(idarticolo, data[0].idParolaChiave);
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
                                                let a_list = element["authors"]["authors"];
                                                for (let i = 0; i < a_list.length; i++) {
                                                    let autore = new autoreModel(undefined, a_list[i]["full_name"]);
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
                                                                        if (a_list[i]["affiliation"] != null) {
                                                                            let affiliazione = a_list[i]["affiliation"];
                                                                            let nome = affiliazione.split(', ')[0].replace(regex, escaper);
                                                                            let luogo = affiliazione.split(', ').splice(1).join(', ').replace(regex, escaper);
                                                                            let organiz = new organizzazioneModel(undefined, nome, luogo);
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
                                                                if (a_list[i]["affiliation"] != null) {
                                                                    let affiliazione = a_list[i]["affiliation"];
                                                                    let nome = affiliazione.split(', ')[0].replace(regex, escaper);
                                                                    let luogo = affiliazione.split(', ').splice(1).join(', ').replace(regex, escaper);
                                                                    let organiz = new organizzazioneModel(undefined, nome, luogo);
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
                    });
                } else {
                    if (element["conference_location"] == null) {
                        clocation = "";  
                    } else {
                        clocation = element["conference_location"].replace(regex, escaper);
                    }
                    let cdate = element["conference_dates"];
                    let conferenza = new conferenzaModel(undefined, pub_title, clocation, cdate);
                    db.query(conferenza.saveNew(), (err, data) => {
                        if(err) {console.log('Salvataggio conferenza: '+err);}
                        if(!err) {
                            db.query(conferenza.getConferenzaByNome(), (err, data)=> {
                                if(!err) {
                                    let idconferenza = data[0].idConferenza;
                                    let articolo = new articoloModel(undefined, title, abstract, doi, issn, isbn, year, idconferenza, 1);
                                    db.query(articolo.saveNew(), (err, data) => {
                                        if(err) {console.log('Salvataggio articolo: '+err);}
                                        if(!err) {
                                            let url;
                                            if (element["html_url"] == null) {
                                                if (element["abstract_url"] == null) {
                                                    url = element["pdf_url"];
                                                } else {
                                                    url = element["abstract_url"];
                                                }    
                                            } else {
                                                url = element["html_url"];
                                            }
                                            db.query(articolo.getArticoloByTitolo_Anno(), (err, data) => {
                                                if(!err) {
                                                    let presente = new presenteinModel(data[0].idArticolo, 1, url);
                                                    db.query(presente.save(), (err, data) => {
                                                        if(err) {console.log('Salvataggio Articolo-repo: '+err);}
                                                        if(!err) {
                                                            //console.log('Articolo-repo salvato');
                                                        }
                                                    });
                                                    let citazione = new citatodaModel(citaId,data[0].idArticolo);
                                                    db.query(citazione.save(), (err, data) => {
                                                        if(err) {console.log('Salvataggio citazione: '+err);}
                                                        if(!err) {
                                                            console.log('Citazione salvata');
                                                        }
                                                    });
                                                }
                                            });
                                            if (data.insertId == 0) {
                                                console.log('articolo esistente');
                                            } else {
                                                let idarticolo = data.insertId;
                                                if (element["index_terms"]["ieee_terms"] != null) {
                                                    let kwords = element["index_terms"]["ieee_terms"]["terms"];
                                                    for (let j = 0; j < kwords.length; j++) {
                                                        let keyword = new parolachiaveModel(undefined, kwords[j]);
                                                        db.query(keyword.saveNew(), (err, data) => {
                                                            if(err) {console.log('Salvataggio keyword: '+err);}
                                                            if (!err) {
                                                                //console.log('keyword salvata');
                                                                db.query(keyword.getParolaChiaveByTermine(), (err, data) => {
                                                                    if (!err) {
                                                                        let art_kw = new relativoaModel(idarticolo, data[0].idParolaChiave);
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
                                                let a_list = element["authors"]["authors"];
                                                for (let i = 0; i < a_list.length; i++) {
                                                    let autore = new autoreModel(undefined, a_list[i]["full_name"]);
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
                                                                            if(err){ console.log(i +', Salvataggio cofnerence relazione scrittoda: '+err);}
                                                                            if(!err) {
                                                                                console.log('Salvato autore');
                                                                            }
                                                                        });
                                                                        if (a_list[i]["affiliation"] != null) {
                                                                            let affiliazione = a_list[i]["affiliation"];
                                                                            let nome = affiliazione.split(', ')[0].replace(regex, escaper);
                                                                            let luogo = affiliazione.split(', ').splice(1).join(', ').replace(regex, escaper);
                                                                            let organiz = new organizzazioneModel(undefined, nome, luogo);
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
                                                                    if(err){ console.log(scrittoda.save());}
                                                                    if(!err) {
                                                                        console.log('Salvato');
                                                                    }
                                                                });
                                                                if (a_list[i]["affiliation"] != null) {
                                                                    let affiliazione = a_list[i]["affiliation"];
                                                                    let nome = affiliazione.split(', ')[0].replace(regex, escaper);
                                                                    let luogo = affiliazione.split(', ').splice(1).join(', ').replace(regex, escaper);
                                                                    let organiz = new organizzazioneModel(undefined, nome, luogo);
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
                    });
                }
            }
        };
        xhr.send();
    });
}

async function getSingleRef(page) {
    let art = new articoloModel();
    db.query(art.getArticoloFromIEEE(), async(err, data) => {
        if(err) {console.log(err);}
        if(!err) {
            for (const element of data) {
                let art_url = element["URL_Articolo"] + 'references#references';
                let art_id = element["idArticolo"];
                if (!(art_url.includes('arnumber'))) {
                    await page.goto(art_url, {waitUntil: 'load', timeout: 0});
                    await page.waitForSelector('div.ref-links-container', {timeout: 0});
                    const num_ref = await page.evaluate(() => {
                        return document.getElementsByClassName('ref-links-container').length;
                    });
                    let found = 0;
                    for (let index = num_ref/2; index < num_ref; index++) {
                        let findable = await page.evaluate((num) => {
                            return document.getElementsByClassName('ref-links-container')[num].innerText.includes('Full Text');
                        }, index);
                        if (findable) {
                            let arnumber = await page.evaluate((ind) => {
                                return document.getElementsByClassName('stats-reference-link-fullTextPdf')[ind].href.split('arnumber=')[1];
                            }, found);
                            found++;
                            processArticle(arnumber, art_id);
                        } else {
                            const info = await page.evaluate((ind) => {
                                return document.getElementsByClassName('col-12 u-overflow-wrap-break-word')[ind].childNodes[3].innerText.split('"');
                            }, index);
                            if (info.length == 3) {
                                let title = info[1];
                                let y_index = info[2].split(', ').length - 1;
                                let year = info[2].split(', ')[y_index].replace(/[^0-9]/g, '');
                                let art_search = new articoloModel(undefined, title, undefined, undefined, undefined, undefined, year, undefined, undefined);
                                db.query(art_search.getArticoloByTitolo_Anno(), (err, data) => {
                                    if(err) {console.log(err);}
                                    if(!err) {
                                        if (data[0] != undefined) {
                                            let relazione = new citatodaModel(art_id, data[0].idArticolo);
                                            db.query(relazione.save(), (err, data) => {
                                                if(err) {console.log(err);}
                                                if(!err) {
                                                    console.log('relazione salvata');
                                                }
                                            });
                                        }
                                    }
                                });
                            }
                        }
                    }
                }
            }
        }
    });
}


/*
const apiurl = 'http://ieeexploreapi.ieee.org/api/v1/search/articles?apikey=esvghg4gbrwh36tzev6xumhs&format=json&max_records=2&start_record=1&sort_order=asc&sort_field=article_number&article_title=remote+laboratory'
db.open();
req.open('GET', apiurl, true);
req.send();
req.onreadystatechange = processRequest;
*/


db.open();
(async () => {
    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();
    await getSingleRef(page);
})();