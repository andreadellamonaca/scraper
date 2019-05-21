class Organizzazione {

    constructor(idOrganizzazione, nome, sede){
        this.idOrganizzazione = idOrganizzazione;
        this.nome = nome;
        this.sede = sede;
    }

    save() {
        let sql=`INSERT INTO Organizzazione(Nome, Sede) VALUES('${this.nome}', '${this.sede}')`;
        return sql;           
    }

    getOrganizzazioneByNome() {
        let sql =`SELECT * FROM Organizzazione WHERE Nome='${this.nome}'`;
        return sql;
    }

    saveNew() {
        let sql =`INSERT INTO Organizzazione(Nome, Sede)
        SELECT * FROM (SELECT '${this.nome}', '${this.sede}') AS tmp
        WHERE NOT EXISTS (
            SELECT Nome FROM Organizzazione WHERE Nome = '${this.nome}'
        ) LIMIT 1`;
        return sql;
    }
}

module.exports = Organizzazione;