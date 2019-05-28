-- MySQL dump 10.13  Distrib 8.0.11, for Win64 (x86_64)
--
-- Host: localhost    Database: bibliog
-- ------------------------------------------------------
-- Server version	8.0.11

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
 SET NAMES utf8 ;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `affiliatoa`
--

DROP TABLE IF EXISTS `affiliatoa`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `affiliatoa` (
  `idAutore` int(11) NOT NULL,
  `idOrganizzazione` int(11) NOT NULL,
  PRIMARY KEY (`idAutore`,`idOrganizzazione`),
  KEY `fk_Autore_has_Organizzazione_Organizzazione1_idx` (`idOrganizzazione`),
  KEY `fk_Autore_has_Organizzazione_Autore1_idx` (`idAutore`),
  CONSTRAINT `fk_Autore_has_Organizzazione_Autore1` FOREIGN KEY (`idAutore`) REFERENCES `autore` (`idautore`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_Autore_has_Organizzazione_Organizzazione1` FOREIGN KEY (`idOrganizzazione`) REFERENCES `organizzazione` (`idorganizzazione`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `affiliatoa`
--

LOCK TABLES `affiliatoa` WRITE;
/*!40000 ALTER TABLE `affiliatoa` DISABLE KEYS */;
/*!40000 ALTER TABLE `affiliatoa` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `articolo`
--

DROP TABLE IF EXISTS `articolo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `articolo` (
  `idArticolo` int(11) NOT NULL AUTO_INCREMENT,
  `Titolo` varchar(500) DEFAULT NULL,
  `Abstract` mediumtext,
  `DOI` varchar(200) DEFAULT NULL,
  `ISSN` varchar(100) DEFAULT NULL,
  `ISBN` varchar(100) DEFAULT NULL,
  `AnnoPubblicazione` int(4) DEFAULT NULL,
  `idConferenzaPresentazione` int(11) NOT NULL,
  `idGiornale` int(11) NOT NULL,
  PRIMARY KEY (`idArticolo`),
  KEY `fk_Articolo_Conferenza1_idx` (`idConferenzaPresentazione`),
  KEY `fk_Articolo_Giornale1_idx` (`idGiornale`),
  CONSTRAINT `fk_Articolo_Conferenza1` FOREIGN KEY (`idConferenzaPresentazione`) REFERENCES `conferenza` (`idconferenza`),
  CONSTRAINT `fk_Articolo_Giornale1` FOREIGN KEY (`idGiornale`) REFERENCES `giornale` (`idgiornale`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `articolo`
--

LOCK TABLES `articolo` WRITE;
/*!40000 ALTER TABLE `articolo` DISABLE KEYS */;
/*!40000 ALTER TABLE `articolo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `autore`
--

DROP TABLE IF EXISTS `autore`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `autore` (
  `idAutore` int(11) NOT NULL AUTO_INCREMENT,
  `NomeCompleto` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`idAutore`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `autore`
--

LOCK TABLES `autore` WRITE;
/*!40000 ALTER TABLE `autore` DISABLE KEYS */;
/*!40000 ALTER TABLE `autore` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `citatoda`
--

DROP TABLE IF EXISTS `citatoda`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `citatoda` (
  `idArticolocheCita` int(11) NOT NULL,
  `idArticoloCitato` int(11) NOT NULL,
  PRIMARY KEY (`idArticolocheCita`,`idArticoloCitato`),
  KEY `fk_Articolo_has_Articolo_Articolo1_idx` (`idArticolocheCita`),
  KEY `fk_Articolo_has_Articolo_Articolo_idx` (`idArticoloCitato`),
  CONSTRAINT `fk_Articolo_has_Articolo_Articolo` FOREIGN KEY (`idArticoloCitato`) REFERENCES `articolo` (`idarticolo`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_Articolo_has_Articolo_Articolo1` FOREIGN KEY (`idArticolocheCita`) REFERENCES `articolo` (`idarticolo`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `citatoda`
--

LOCK TABLES `citatoda` WRITE;
/*!40000 ALTER TABLE `citatoda` DISABLE KEYS */;
/*!40000 ALTER TABLE `citatoda` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `conferenza`
--

DROP TABLE IF EXISTS `conferenza`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `conferenza` (
  `idConferenza` int(11) NOT NULL AUTO_INCREMENT,
  `Nome` varchar(200) DEFAULT NULL,
  `Luogo` varchar(200) DEFAULT NULL,
  `Data` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`idConferenza`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `conferenza`
--

LOCK TABLES `conferenza` WRITE;
/*!40000 ALTER TABLE `conferenza` DISABLE KEYS */;
INSERT INTO `conferenza` VALUES (1,'None','None','None');
/*!40000 ALTER TABLE `conferenza` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `giornale`
--

DROP TABLE IF EXISTS `giornale`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `giornale` (
  `idGiornale` int(11) NOT NULL AUTO_INCREMENT,
  `Titolo` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`idGiornale`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `giornale`
--

LOCK TABLES `giornale` WRITE;
/*!40000 ALTER TABLE `giornale` DISABLE KEYS */;
INSERT INTO `giornale` VALUES (1,'None');
/*!40000 ALTER TABLE `giornale` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `organizzazione`
--

DROP TABLE IF EXISTS `organizzazione`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `organizzazione` (
  `idOrganizzazione` int(11) NOT NULL AUTO_INCREMENT,
  `Nome` varchar(500) DEFAULT NULL,
  `Sede` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`idOrganizzazione`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `organizzazione`
--

LOCK TABLES `organizzazione` WRITE;
/*!40000 ALTER TABLE `organizzazione` DISABLE KEYS */;
/*!40000 ALTER TABLE `organizzazione` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `parolachiave`
--

DROP TABLE IF EXISTS `parolachiave`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `parolachiave` (
  `idParolaChiave` int(11) NOT NULL AUTO_INCREMENT,
  `Termine` varchar(300) DEFAULT NULL,
  PRIMARY KEY (`idParolaChiave`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `parolachiave`
--

LOCK TABLES `parolachiave` WRITE;
/*!40000 ALTER TABLE `parolachiave` DISABLE KEYS */;
/*!40000 ALTER TABLE `parolachiave` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `presentein`
--

DROP TABLE IF EXISTS `presentein`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `presentein` (
  `idArticolo` int(11) NOT NULL,
  `idRepository` int(11) NOT NULL,
  `URL_Articolo` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`idArticolo`,`idRepository`),
  KEY `fk_Articolo_has_Repository_Repository1_idx` (`idRepository`),
  KEY `fk_Articolo_has_Repository_Articolo1_idx` (`idArticolo`),
  CONSTRAINT `fk_Articolo_has_Repository_Articolo1` FOREIGN KEY (`idArticolo`) REFERENCES `articolo` (`idarticolo`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_Articolo_has_Repository_Repository1` FOREIGN KEY (`idRepository`) REFERENCES `repository` (`idrepository`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `presentein`
--

LOCK TABLES `presentein` WRITE;
/*!40000 ALTER TABLE `presentein` DISABLE KEYS */;
/*!40000 ALTER TABLE `presentein` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `relativoa`
--

DROP TABLE IF EXISTS `relativoa`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `relativoa` (
  `idArticolo` int(11) NOT NULL,
  `idParolaChiave` int(11) NOT NULL,
  PRIMARY KEY (`idArticolo`,`idParolaChiave`),
  KEY `fk_Articolo_has_ParolaChiave_ParolaChiave1_idx` (`idParolaChiave`),
  KEY `fk_Articolo_has_ParolaChiave_Articolo1_idx` (`idArticolo`),
  CONSTRAINT `fk_Articolo_has_ParolaChiave_Articolo1` FOREIGN KEY (`idArticolo`) REFERENCES `articolo` (`idarticolo`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_Articolo_has_ParolaChiave_ParolaChiave1` FOREIGN KEY (`idParolaChiave`) REFERENCES `parolachiave` (`idparolachiave`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `relativoa`
--

LOCK TABLES `relativoa` WRITE;
/*!40000 ALTER TABLE `relativoa` DISABLE KEYS */;
/*!40000 ALTER TABLE `relativoa` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `repository`
--

DROP TABLE IF EXISTS `repository`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `repository` (
  `idRepository` int(11) NOT NULL AUTO_INCREMENT,
  `Nome` varchar(100) DEFAULT NULL,
  `URL` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`idRepository`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `repository`
--

LOCK TABLES `repository` WRITE;
/*!40000 ALTER TABLE `repository` DISABLE KEYS */;
INSERT INTO `repository` VALUES (1,'IEEEXplore Digital Library','https://ieeexplore.ieee.org/Xplore/home.jsp'),(2,'DBLP Computer Science Bibliography','https://dblp.uni-trier.de/'),(3,'ScienceDirect','https://www.sciencedirect.com/'),(4,'Scopus','https://www.scopus.com/home.uri'),(5,'Microsoft Academic','https://academic.microsoft.com/home'),(6,'ACM Digital Library','https://dl.acm.org/dl.cfm'),(7,'Google Scholar','https://scholar.google.it'),(8,'Web of Science','https://www.webofknowledge.com');
/*!40000 ALTER TABLE `repository` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `scrittoda`
--

DROP TABLE IF EXISTS `scrittoda`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `scrittoda` (
  `idArticolo` int(11) NOT NULL,
  `idAutore` int(11) NOT NULL,
  PRIMARY KEY (`idArticolo`,`idAutore`),
  KEY `fk_Articolo_has_Autore_Autore1_idx` (`idAutore`),
  KEY `fk_Articolo_has_Autore_Articolo1_idx` (`idArticolo`),
  CONSTRAINT `fk_Articolo_has_Autore_Articolo1` FOREIGN KEY (`idArticolo`) REFERENCES `articolo` (`idarticolo`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_Articolo_has_Autore_Autore1` FOREIGN KEY (`idAutore`) REFERENCES `autore` (`idautore`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `scrittoda`
--

LOCK TABLES `scrittoda` WRITE;
/*!40000 ALTER TABLE `scrittoda` DISABLE KEYS */;
/*!40000 ALTER TABLE `scrittoda` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2019-05-28 18:38:07
