class MockDb {
    constructor() {
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
    }
  
    /**
     * Retrieve all bands.
     * @returns {Array} List of bands.
     */
    findBands() {
      return this.bands;
    }
  
    /**
     * Retrieve bands filtered by genre.
     * @param {string} genre - The genre to filter bands by.
     * @returns {Array} List of bands matching the genre.
     */
    findBandsBy(genre) {
      return this.bands.filter((band) => band.genre.toLowerCase() === genre.toLowerCase());
    }
  }
  
  // Export the MockDb class
  module.exports = MockDb;
  