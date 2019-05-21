class PresenteIn {

    constructor(idArticolo, idRepository, url){
        this.idRepository = idRepository;
        this.idArticolo = idArticolo;
        this.url = url;
    }

    save() {
        let sql = `INSERT INTO PresenteIn(idArticolo, idRepository, URL_Articolo) VALUES('${this.idArticolo}', '${this.idRepository}', '${this.url}')`;
        return sql;           
    }

    getByidArticolo() {
        let sql = `SELECT * FROM PresenteIn WHERE idArticolo='${this.idArticolo}'`;
        return sql;
    }

    getByidRepository() {
        let sql = `SELECT * FROM PresenteIn WHERE idRepository='${this.idRepository}'`;
        return sql;
    }

    getByidRepository_idArticolo() {
        let sql = `SELECT * FROM PresenteIn WHERE idRepository='${this.idRepository}' AND idArticolo='${this.idArticolo}'`;
        return sql;
    }
}

module.exports = PresenteIn;