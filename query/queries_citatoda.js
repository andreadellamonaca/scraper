class CitatoDa {

    constructor(idArticolocheCita, idArticoloCitato){
        this.idArticolocheCita = idArticolocheCita;
        this.idArticoloCitato = idArticoloCitato;
    }

    save() {
        let sql = `INSERT INTO CitatoDa(idArticolocheCita, idArticoloCitato) VALUES('${this.idArticolocheCita}', '${this.idArticoloCitato}')`;
        return sql;           
    }

    getByidArticolocheCita() {
        let sql = `SELECT * FROM CitatoDa WHERE idArticolocheCita='${this.idArticolocheCita}'`;
        return sql;
    }

    getByidArticoloCitato() {
        let sql = `SELECT * FROM CitatoDa WHERE idArticoloCitato='${this.idArticoloCitato}'`;
        return sql;
    }

    getByidCita_idCitato() {
        let sql = `SELECT * FROM CitatoDa WHERE idArticolocheCita='${this.idArticolocheCita}' AND idArticoloCitato='${this.idArticoloCitato}'`;
        return sql;
    }
}

module.exports = CitatoDa;