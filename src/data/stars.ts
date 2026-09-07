export interface Star {
  id: string
  name: string
  designation: string
  constellationId: string
  distance: number
  magnitude: number
  spectralType: string
  temperature: number
  mass?: number
  radius?: number
  luminosity?: number
  age?: string
  coordinates: { ra: string; dec: string }
  system?: string
  planets?: string[]
  description: string
}

export const stars: Star[] = [
  {
    id: 'betelgeuse',
    name: 'Betelgeuse',
    designation: '\u03b1 Orionis',
    constellationId: 'orion',
    distance: 548,
    magnitude: 0.42,
    spectralType: 'M1\u2013M2 Ia\u2013ab',
    temperature: 3600,
    mass: 16.5,
    radius: 887,
    luminosity: 126000,
    age: '~10 million years',
    coordinates: { ra: '05h 55m 10s', dec: '+07\u00b0 24\u2032 25\u2033' },
    system: 'Betelgeuse system',
    description: 'A red supergiant and one of the largest stars visible to the naked eye. Expected to go supernova in the relatively near future (astronomically speaking).',
  },
  {
    id: 'rigel',
    name: 'Rigel',
    designation: '\u03b2 Orionis',
    constellationId: 'orion',
    distance: 860,
    magnitude: 0.13,
    spectralType: 'B8 Ia',
    temperature: 12100,
    mass: 21,
    radius: 78.9,
    luminosity: 120000,
    coordinates: { ra: '05h 14m 32s', dec: '\u221208\u00b0 12\u2032 06\u2033' },
    description: 'A blue-white supergiant, the brightest star in Orion and the seventh-brightest star in the night sky.',
  },
  {
    id: 'antares',
    name: 'Antares',
    designation: '\u03b1 Scorpii',
    constellationId: 'scorpius',
    distance: 550,
    magnitude: 0.96,
    spectralType: 'M1.5 Iab-b',
    temperature: 3660,
    mass: 12,
    radius: 680,
    luminosity: 75000,
    coordinates: { ra: '16h 29m 24s', dec: '\u221226\u00b0 25\u2032 55\u2033' },
    description: 'A red supergiant whose name means "rival of Mars" due to its similar color and brightness.',
  },
  {
    id: 'deneb',
    name: 'Deneb',
    designation: '\u03b1 Cygni',
    constellationId: 'cygnus',
    distance: 2615,
    magnitude: 1.25,
    spectralType: 'A2 Ia',
    temperature: 8525,
    mass: 19,
    radius: 203,
    luminosity: 196000,
    coordinates: { ra: '20h 41m 26s', dec: '+45\u00b0 16\u2032 49\u2033' },
    description: 'One of the most luminous stars known and the brightest star in Cygnus, forming one vertex of the Summer Triangle.',
  },
  {
    id: 'regulus',
    name: 'Regulus',
    designation: '\u03b1 Leonis',
    constellationId: 'leo',
    distance: 79,
    magnitude: 1.35,
    spectralType: 'B8 IVn',
    temperature: 12460,
    mass: 3.8,
    radius: 3.22,
    luminosity: 288,
    coordinates: { ra: '10h 08m 22s', dec: '+11\u00b0 58\u2032 02\u2033' },
    system: 'Regulus system (multiple)',
    description: 'The brightest star in Leo and one of the brightest stars in the night sky. It is a multiple star system.',
  },
  {
    id: 'sirius',
    name: 'Sirius',
    designation: '\u03b1 Canis Majoris',
    constellationId: 'canis-major',
    distance: 8.6,
    magnitude: -1.46,
    spectralType: 'A1 V',
    temperature: 9940,
    mass: 2.06,
    radius: 1.71,
    luminosity: 25.4,
    coordinates: { ra: '06h 45m 09s', dec: '\u221216\u00b0 42\u2032 58\u2033' },
    system: 'Sirius A + Sirius B (white dwarf)',
    planets: [],
    description: 'The brightest star in the night sky. A binary system consisting of a main-sequence star and a white dwarf companion.',
  },
]
