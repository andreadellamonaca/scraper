class RelativoA {

    constructor(idArticolo, idParolaChiave){
        this.idArticolo = idArticolo;
        this.idParolaChiave = idParolaChiave;
    }

    save() {
        let sql = `INSERT INTO relativoa(idArticolo, idParolaChiave) VALUES('${this.idArticolo}', '${this.idParolaChiave}')`;
        return sql;           
    }
}

module.exports = RelativoA;