export interface Constellation {
  id: string
  name: string
  abbreviation: string
  genitive: string
  hemisphere: 'Northern' | 'Southern' | 'Equatorial'
  area: number
  visibility: string
  description: string
  majorStars: string[]
  notableObjects: string[]
  mythology?: string
}

export const constellations: Constellation[] = [
  {
    id: 'orion',
    name: 'Orion',
    abbreviation: 'Ori',
    genitive: 'Orionis',
    hemisphere: 'Equatorial',
    area: 594,
    visibility: 'Best viewed in winter (Northern Hemisphere)',
    description: 'One of the most recognizable constellations, depicting a hunter with a distinctive belt of three stars.',
    majorStars: ['Betelgeuse', 'Rigel', 'Bellatrix', 'Alnitak', 'Alnilam', 'Mintaka'],
    notableObjects: ['Orion Nebula (M42)', 'Horsehead Nebula', 'Flame Nebula'],
    mythology: 'Named after the hunter in Greek mythology.',
  },
  {
    id: 'ursa-major',
    name: 'Ursa Major',
    abbreviation: 'UMa',
    genitive: 'Ursae Majoris',
    hemisphere: 'Northern',
    area: 1280,
    visibility: 'Circumpolar for most northern latitudes',
    description: 'The Great Bear, containing the famous Big Dipper asterism used for navigation.',
    majorStars: ['Dubhe', 'Merak', 'Phecda', 'Megrez', 'Alioth', 'Mizar', 'Alkaid'],
    notableObjects: ['Pinwheel Galaxy (M101)', 'Owl Nebula (M97)', 'Whirlpool Galaxy (M51)'],
  },
  {
    id: 'cassiopeia',
    name: 'Cassiopeia',
    abbreviation: 'Cas',
    genitive: 'Cassiopeiae',
    hemisphere: 'Northern',
    area: 598,
    visibility: 'Circumpolar in northern latitudes',
    description: 'The distinctive W-shaped constellation representing the vain queen of Greek mythology.',
    majorStars: ['Schedar', 'Caph', 'Gamma Cas', 'Ruchbah', 'Segin'],
    notableObjects: ['Cassiopeia A', 'Heart Nebula', 'Soul Nebula'],
  },
  {
    id: 'scorpius',
    name: 'Scorpius',
    abbreviation: 'Sco',
    genitive: 'Scorpii',
    hemisphere: 'Southern',
    area: 497,
    visibility: 'Best in summer (Northern Hemisphere)',
    description: 'A striking constellation resembling a scorpion, rich in bright stars and deep-sky objects.',
    majorStars: ['Antares', 'Shaula', 'Sargas', 'Dschubba', 'Larawag'],
    notableObjects: ['Butterfly Cluster (M6)', 'Ptolemy Cluster (M7)', "Cat's Paw Nebula"],
  },
  {
    id: 'cygnus',
    name: 'Cygnus',
    abbreviation: 'Cyg',
    genitive: 'Cygni',
    hemisphere: 'Northern',
    area: 804,
    visibility: 'Best in summer and autumn',
    description: 'The Swan, featuring the Northern Cross asterism and the bright star Deneb.',
    majorStars: ['Deneb', 'Albireo', 'Sadr', 'Gienah', 'Delta Cygni'],
    notableObjects: ['North America Nebula', 'Veil Nebula', 'Cygnus X-1'],
  },
  {
    id: 'leo',
    name: 'Leo',
    abbreviation: 'Leo',
    genitive: 'Leonis',
    hemisphere: 'Northern',
    area: 947,
    visibility: 'Best in spring',
    description: 'The Lion, one of the zodiac constellations with a distinctive sickle-shaped head.',
    majorStars: ['Regulus', 'Denebola', 'Algieba', 'Zosma', 'Chertan'],
    notableObjects: ['Leo Triplet', 'Messier 65', 'Messier 66'],
  },
]
