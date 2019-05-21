class ScrittoDa {

    constructor(idAutore, idArticolo){
        this.idAutore = idAutore;
        this.idArticolo = idArticolo;
    }

    save() {
        let sql = `INSERT INTO ScrittoDa(idArticolo, idAutore) VALUES('${this.idArticolo}', '${this.idAutore}')`;
        return sql;           
    }

    getByidArticolo() {
        let sql = `SELECT * FROM ScrittoDa WHERE idArticolo='${this.idArticolo}'`;
        return sql;
    }

    getByidAutore() {
        let sql = `SELECT * FROM ScrittoDa WHERE idAutore='${this.idAutore}'`;
        return sql;
    }

    getByidAutore_idArticolo() {
        let sql = `SELECT * FROM ScrittoDa WHERE idAutore='${this.idAutore}' AND idArticolo='${this.idArticolo}'`;
        return sql;
    }
}

module.exports = ScrittoDa;