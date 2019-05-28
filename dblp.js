const db = require("./dbConnection");
var request = require("request");
const autoreModel = require('./query/queries_autore');
const articoloModel = require('./query/queries_articolo');
const scrittodaModel = require('./query/queries_scrittoda');
const giornaleModel = require('./query/queries_giornale');
const conferenzaModel = require('./query/queries_conferenza');
const presenteinModel = require('./query/queries_presentein');

var regex = new RegExp(/[\0\x08\x09\x1a\n\r"'\\\%]/g)
var escaper = function escaper(char){
    var m = ['\\0', '\\x08', '\\x09', '\\x1a', '\\n', '\\r', "'", '"', "\\", '\\\\', "%"];
    var r = ['\\\\0', '\\\\b', '\\\\t', '\\\\z', '\\\\n', '\\\\r', "''", '""', '\\\\', '\\\\\\\\', '\\%'];
    return r[m.indexOf(char)];
};


db.open();
var options = { 
    method: 'GET',
    url: 'http://dblp.org/search/publ/api',
    qs: { q: 'remote+laboratory', format: 'json', h: '1000' } };

request(options, function (error, response, body) {
    if (error) throw new Error(error);

    let result = JSON.parse(body)["result"]["hits"]["hit"];
    for (let index = 0; index < 80; index++) {
        let title = result[index]["info"]["title"].replace(regex, escaper);
        let year = result[index]["info"]["year"];
        let abstract = "";
        let doi = result[index]["info"]["doi"];
        let content_type = result[index]["info"]["type"];
        let pub_title = result[index]["info"]["venue"];
        if (content_type.includes('Journal')) {
            let giornale = new giornaleModel(undefined, pub_title);
            db.query(giornale.saveNew(), (err, data) => {
                if(err) {console.log('Salvataggio giornale: '+err);}
                if(!err) {
                    db.query(giornale.getGiornaleByTitolo(), (err, data)=> {
                        if(!err) {
                            let idgiornale = data[0].idGiornale;
                            let articolo = new articoloModel(undefined, title, abstract, doi, '', '', year, 1, idgiornale);
                            db.query(articolo.saveNew(), (err, data) => {
                                if(err) {console.log('Salvataggio articolo: '+err);}
                                if(!err) {
                                    let url = result[index]["info"]["url"];
                                    db.query(articolo.getArticoloByTitolo_Anno(), (err, data) => {
                                        if(err) {console.log('Salvataggio presentein: '+err);}
                                        if(!err) {
                                            let presente = new presenteinModel(data[0].idArticolo, 2, url);
                                            db.query(presente.save(), (err, data) => {
                                                if(err) {console.log('Salvataggio Articolo-repo: '+err);}
                                                if(!err) {
                                                    console.log('Articolo-repo salvato');
                                                }
                                            });
                                        }
                                    });
                                    if (data.insertId == 0) {
                                        console.log('articolo esistente');
                                    } else {
                                        let idarticolo = data.insertId;
                                        let autori = result[index]["info"]["authors"]["author"];
                                        let a_list = [];
                                        if (typeof autori == 'object') {
                                            for (let i = 0; i < autori.length; i++) {
                                                a_list.push(autori[i]);
                                            }        
                                        } else {
                                            a_list.push(autori);
                                        }
                                        for (let i = 0; i < a_list.length; i++) {
                                            let autore = new autoreModel(undefined, a_list[i]);
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
                                                                        //console.log('Salvato');
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
                                                                //console.log('Salvato');
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
            });
        } else {
            let conferenza = new conferenzaModel(undefined, pub_title, "", "");
            db.query(conferenza.saveNew(), (err, data) => {
                if(err) {console.log('Salvataggio conferenza: '+err);}
                if(!err) {
                    db.query(conferenza.getConferenzaByNome(), (err, data)=> {
                        if(!err) {
                            let idconferenza = data[0].idConferenza;
                            let articolo = new articoloModel(undefined, title, abstract, doi, '', '', year, idconferenza, 1);
                            db.query(articolo.saveNew(), (err, data) => {
                                if(err) {console.log('Salvataggio articolo: '+err);}
                                if(!err) {
                                    let url = result[index]["info"]["url"];
                                    db.query(articolo.getArticoloByTitolo_Anno(), (err, data) => {
                                        if(err) {console.log('Salvataggio presentein: '+err);}
                                        if(!err) {
                                            let presente = new presenteinModel(data[0].idArticolo, 2, url);
                                            db.query(presente.save(), (err, data) => {
                                                if(err) {console.log('Salvataggio Articolo-repo: '+err);}
                                                if(!err) {
                                                    console.log('Articolo-repo salvato');
                                                }
                                            });
                                        }
                                    });
                                    if (data.insertId == 0) {
                                        console.log('articolo esistente');
                                    } else {
                                        let idarticolo = data.insertId;
                                        let autori = result[index]["info"]["authors"]["author"];
                                        let a_list = [];
                                        if (typeof autori == 'object') {
                                            for (let i = 0; i < autori.length; i++) {
                                                a_list.push(autori[i]);
                                            }        
                                        } else {
                                            a_list.push(autori);
                                        }
                                        for (let i = 0; i < a_list.length; i++) {
                                            let autore = new autoreModel(undefined, a_list[i]);
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
                                                                        //console.log('Salvato');
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
                                                                //console.log('Salvato');
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
            });
        }
    };
});