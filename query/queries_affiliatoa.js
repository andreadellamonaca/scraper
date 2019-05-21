class AffiliatoA {

    constructor(idAutore, idOrganizzazione){
        this.idAutore = idAutore;
        this.idOrganizzazione = idOrganizzazione;
    }

    save() {
        let sql = `INSERT INTO AffiliatoA(idAutore, idOrganizzazione) VALUES('${this.idAutore}', '${this.idOrganizzazione}')`;
        return sql;           
    }

    getByidOrganizzazione() {
        let sql = `SELECT * FROM AffiliatoA WHERE idOrganizzazione='${this.idOrganizzazione}'`;
        return sql;
    }

    getByidAutore() {
        let sql = `SELECT * FROM AffiliatoA WHERE idAutore='${this.idAutore}'`;
        return sql;
    }

    getByidAutore_idOrganizzazione() {
        let sql = `SELECT * FROM AffiliatoA WHERE idAutore='${this.idAutore}' AND idOrganizzazione='${this.idOrganizzazione}'`;
        return sql;
    }
}

module.exports = AffiliatoA;