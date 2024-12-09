class DBMock {
  constructor() {
    // Inizializza i "database" come array in memoria
    this.musicians = [
      {
        userType: 'musician',
        musician_id: 1,
        full_name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        instrument: 'Guitar',
        experience: 'Intermediate',
        description: 'Looking for a band to jam with.',
        location: 'New York',
      },
      {
        userType: 'musician',
        musician_id: 2,
        full_name: 'Jane Smith',
        email: 'jane@example.com',
        password: 'securePass!',
        instrument: 'Drums',
        experience: 'Expert',
        description: 'Seasoned drummer open to collaborations.',
        location: 'Los Angeles',
      },
    ];

    this.bands = [
      {
        userType: 'band',
        band_id: 1,
        full_name: 'Rock Legends',
        email: 'rocklegends@example.com',
        password: 'rockOn!',
        description: 'Rock band looking for a bassist.',
        looking_for: 'Bassist',
        genre: 'Rock',
        location: 'New York',
      },
      {
        userType: 'band',
        band_id: 2,
        full_name: 'Jazz Vibes',
        email: 'jazzvibes@example.com',
        password: 'jazzHands',
        description: 'Jazz ensemble searching for a vocalist.',
        looking_for: 'Vocalist',
        genre: 'Jazz',
        location: 'Chicago',
      },
    ];

    // Generatori ID
    this.nextMusicianId = this.musicians.length
      ? this.musicians[this.musicians.length - 1].musician_id + 1
      : 1;
    this.nextBandId = this.bands.length
      ? this.bands[this.bands.length - 1].band_id + 1
      : 1;
  }

  // **Musicians**

  getAllMusicians() {
    return this.musicians.map(({ password, ...musician }) => musician);
  }

  getMusicianById(id) {
    const musician = this.musicians.find((m) => m.musician_id === id);
    if (!musician) return null;
    const { password, ...musicianWithoutPassword } = musician;
    return musicianWithoutPassword;
  }

  createMusician({ full_name, email, password, instrument, experience, description, location }) {
    if (!full_name || !email || !password || !instrument || !experience || !location) {
      throw new Error('Tutti i campi sono obbligatori per creare un musicista.');
    }
    const newMusician = {
      userType: 'musician',
      musician_id: this.nextMusicianId++,
      full_name,
      email,
      password,
      instrument,
      experience,
      description: description || '',
      location,
    };
    this.musicians.push(newMusician);
    return newMusician;
  }

  deleteMusician(id) {
    const index = this.musicians.findIndex((m) => m.musician_id === id);
    if (index === -1) return false;
    this.musicians.splice(index, 1);
    return true;
  }

  // **Bands**

  getAllBands() {
    return this.bands.map(({ password, ...band }) => band);
  }

  getBandById(id) {
    const band = this.bands.find((b) => b.band_id === id);
    if (!band) return null;
    const { password, ...bandWithoutPassword } = band;
    return bandWithoutPassword;
  }

  createBand({ full_name, email, password, description, looking_for, genre, location }) {
    if (!full_name || !email || !password || !location || !genre) {
      throw new Error('Tutti i campi sono obbligatori per creare una band.');
    }
    const newBand = {
      userType: 'band',
      band_id: this.nextBandId++,
      full_name,
      email,
      password,
      description: description || '',
      looking_for: looking_for || '',
      genre,
      location,
    };
    this.bands.push(newBand);
    return newBand;
  }

  deleteBand(id) {
    const index = this.bands.findIndex((b) => b.band_id === id);
    if (index === -1) return false;
    this.bands.splice(index, 1);
    return true;
  }
}

module.exports = DBMock;
