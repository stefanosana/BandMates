# 🎶 BandMates 🎶

---

## 📜 Presentazione della piattaforma
**Titolo**: BandMates  
**Descrizione**:  
BandMates è la piattaforma ideale per musicisti e band alla ricerca di nuove collaborazioni. Se sei un musicista in cerca di una band o una band in cerca di nuovi membri, BandMates ti aiuta a trovare la soluzione giusta. Grazie a funzionalità dedicate per mettere in contatto musicisti e band, potrai facilmente organizzare sessioni di prova, jam session o collaborazioni future, tutto dalla piattaforma.

> "Trova la tua band, crea la tua musica – Unisciti a chi condivide la tua passione!"

**Target**: Band e Musicisti  
**Problema**: Mancanza di gente con cui suonare  
**Competitor**: Villaggio Musicale, Musiqua, Mercatino Musicale, Showgroup  
**Tecnologie**: Git  
**Repository GitHub**: [BandMates Repository](https://github.com/stefanosana/BandMates.git)  
**Timestamp**: 1726737714  

---

## 📩 Risposte HTTP in formato JSON

### Login riuscito
```json
{
  "status": 200,
  "message": "Login avvenuto con successo",
  "data": {
    "user_id": "12345",
    "username": "music_lover",
    "email": "music_lover@example.com",
    "token": "abcd1234efgh5678ijkl9012mnop3456",
    "expires_in": 3600
  }
}
```

### Ricerca Riuscita
```json
{
  "status": 200,
  "message": "Ricerca avvenuta con successo",
  "data": {
    "results": [
      {
        "user_id": "56789",
        "username": "guitar_master",
        "location": "Milano, Italia",
        "genre": "Rock",
        "instruments": ["Chitarra"],
        "experience_years": 5,
        "availability": "Sera",
        "profile_url": "/users/56789"
      },
      {
        "user_id": "98765",
        "username": "drum_hero",
        "location": "Milano, Italia",
        "genre": "Jazz",
        "instruments": ["Batteria"],
        "experience_years": 10,
        "availability": "Weekend",
        "profile_url": "/users/98765"
      }
    ],
    "total_results": 2,
    "saved_search": {
      "search_id": "abc123",
      "name": "Musicisti Rock a Milano",
      "alerts_enabled": true,
      "alert_frequency": "giornaliera"
    }
  }
}

```

### Messaggio inviato con successo (Chat singola)
```json
{
  "status": 200,
  "message": "Messaggio inviato con successo",
  "data": {
    "message_id": "msg_001",
    "sender_id": "12345",
    "recipient_id": "56789",
    "chat_type": "singola",  
    "content": {
      "text": "Ehi, ascolta questo nuovo riff!",
      "media": {
        "file_type": "audio",
        "file_url": "/media/demo_riff.mp3"
      }
    },
    "timestamp": "2024-09-27T12:34:56Z",
    "notifications": {
      "status": "consegnato",
      "notified_users": ["56789"]
    }
  }
}
```

### Messaggio inviato con successo (Chat di gruppo)
```json
{
  "status": 200,
  "message": "Messaggio inviato con successo",
  "data": {
    "message_id": "msg_002",
    "sender_id": "12345",
    "recipient_ids": ["56789", "98765", "65432"],
    "chat_type": "gruppo",
    "group_name": "Discussione Band Rock",
    "content": {
      "text": "Vediamoci per le prove domani!",
      "media": null
    },
    "timestamp": "2024-09-27T14:45:12Z",
    "notifications": {
      "status": "consegnato",
      "notified_users": ["56789", "98765", "65432"]
    }
  }
}

```

### Invio di media riuscito
```json
{
  "status": 200,
  "message": "Media inviato con successo",
  "data": {
    "message_id": "msg_003",
    "sender_id": "12345",
    "recipient_id": "56789",
    "chat_type": "singola",
    "content": {
      "text": null,
      "media": {
        "file_type": "audio",
        "file_name": "nuova_demo_canzone.mp3",
        "file_url": "/media/nuova_demo_canzone.mp3"
      }
    },
    "timestamp": "2024-09-27T16:12:34Z",
    "notifications": {
      "status": "consegnato",
      "notified_users": ["56789"]
    }
  }
}

```

### Feedback inviato con successo
```json
{
  "status": 200,
  "message": "Feedback inviato con successo",
  "data": {
    "feedback_id": "fb_001",
    "utente_id": "12345",
    "tipo_feedback": "richiesta_funzione",
    "descrizione": "Sarebbe utile poter filtrare i musicisti anche per età.",
    "timestamp": "2024-09-27T12:45:00Z",
    "stato_feedback": "in revisione",
    "valutazione_esperienza": {
      "punteggio": 5,
      "commento": "Esperienza molto positiva, app intuitiva e facile da usare!"
    },
    "aggiornamenti": {
      "ultimo_aggiornamento": "2024-09-28T10:30:00Z",
      "dettagli_aggiornamento": "La tua richiesta è stata presa in considerazione per un futuro aggiornamento."
    }
  }
}
```

## 📌 Raccolta dei Requisiti

### Requisiti Funzionali

- **Funzionalità di Messaggistica**:
  - Messaggistica in tempo reale con notifiche istantanee.
  - Supporto per chat singole e di gruppo.
  - Funzionalità di media sharing per scambio di demo o brani musicali.

- **Avere dei criteri di ricerca**:
  - Ricerca per località geografica.
  - Filtri per genere musicale, strumenti suonati, anni di esperienza e disponibilità oraria.
  - Opzione per salvare ricerche preferite o impostare avvisi per nuove corrispondenze.

- **Funzionalità di Login/Register**:
  - Registrazione e login tramite email e password o autenticazione tramite social media.
  - Recupero password e gestione profilo.
  - Verifica tramite email per la validazione dell'account.

- **Implementare il Feedback e Supporto**:
  - Sistema di feedback per segnalare bug, richiedere nuove funzionalità o assistenza.
  - Valutazione dell'esperienza in maniera continuativa.

---

### Requisiti Non Funzionali

- **Sicurezza e Privacy**:
  - Protocollo HTTPS per garantire la sicurezza delle comunicazioni.
  - Crittografia per protezione dei dati dell'utente.
  - Politiche sulla privacy e termini di servizio chiari per la gestione dei dati.

- **Responsive Design e Accessibilità**:
  - Design responsive per supportare l'uso su dispositivi mobili e desktop.
  - Conformità alle linee guida sull'accessibilità per garantire l'accesso a utenti con disabilità.

- **Integrazione con MySQL/Apache**:
  - MySQL per l'archiviazione dei dati.
  - Apache come server per l'hosting e gestione del traffico.

- **Conoscenza Linguaggi di Programmazione**:
  - **HTML, CSS**: per il front-end responsive.
  - **JavaScript**: per l’interattività e la gestione della messaggistica.
  - **SQL**: per la gestione dei dati.

---

### Requisiti di Dominio

- **Conoscenza Musicale**:
  - Familiarità con la terminologia musicale (strumenti, generi, esperienza) per consentire una classificazione accurata di musicisti e band.
