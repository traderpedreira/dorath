// Catálogo de Personagens do Período 1.
// enabled=false mantém personagens planejados fora do jogo até arte, atributos e habilidade serem homologados.
// unlockHouse tem precedência; quando null, unlockPhase define a janela narrativa mínima.

export const CHARACTER_SCHEMA_VERSION = 2;

export const PHASE_START_HOUSE = Object.freeze({
  EDEN: 1,
  POS_QUEDA_CAIM_ABEL: 12,
  GERACOES_CORRUPCAO: 25,
  NOE_ARCA: 40
});

export const characterCatalog = [
  {
    "id": "adao",
    "name": "Adão",
    "lineage": "primeira-familia",
    "roles": [
      "eden",
      "linhagem",
      "agricultura",
      "genealogia"
    ],
    "unlockIndex": 30,
    "unlockHouse": 3,
    "asset": "assets/personagens/01_ADAO.webp",
    "attributes": {
      "conhecimento": 2,
      "influencia": 2,
      "heranca": 2
    },
    "period": 1,
    "enabled": true,
    "unlockPhase": "EDEN",
    "familyTags": [
      "primeira-familia"
    ],
    "relationships": []
  },
  {
    "id": "eva",
    "name": "Eva",
    "lineage": "primeira-familia",
    "roles": [
      "eden",
      "linhagem",
      "genealogia"
    ],
    "unlockIndex": 100,
    "unlockHouse": 10,
    "asset": "assets/personagens/02_EVA.webp",
    "attributes": {
      "conhecimento": 2,
      "influencia": 3,
      "heranca": 2
    },
    "period": 1,
    "enabled": true,
    "unlockPhase": "EDEN",
    "familyTags": [
      "primeira-familia"
    ],
    "relationships": []
  },
  {
    "id": "caim",
    "name": "Caim",
    "lineage": "caim",
    "roles": [
      "agricultura",
      "linhagem",
      "construcao",
      "genealogia"
    ],
    "unlockIndex": 200,
    "unlockHouse": 20,
    "asset": "assets/personagens/03_CAIM.webp",
    "attributes": {
      "conhecimento": 1,
      "influencia": 2,
      "heranca": 0
    },
    "period": 1,
    "enabled": true,
    "unlockPhase": "POS_QUEDA_CAIM_ABEL",
    "familyTags": [
      "linhagem-caim"
    ],
    "relationships": []
  },
  {
    "id": "abel",
    "name": "Abel",
    "lineage": "primeira-familia",
    "roles": [
      "rebanho",
      "fe-oferta",
      "linhagem"
    ],
    "unlockIndex": 200,
    "unlockHouse": 20,
    "asset": "assets/personagens/04_ABEL.webp",
    "attributes": {
      "conhecimento": 1,
      "influencia": 1,
      "heranca": 2
    },
    "period": 1,
    "enabled": true,
    "unlockPhase": "POS_QUEDA_CAIM_ABEL",
    "familyTags": [
      "primeira-familia"
    ],
    "relationships": []
  },
  {
    "id": "sete",
    "name": "Sete",
    "lineage": "sete",
    "roles": [
      "linhagem",
      "genealogia"
    ],
    "unlockIndex": 330,
    "unlockHouse": 33,
    "asset": "assets/personagens/05_SETE.webp",
    "attributes": {
      "conhecimento": 2,
      "influencia": 2,
      "heranca": 2
    },
    "period": 1,
    "enabled": true,
    "unlockPhase": "GERACOES_CORRUPCAO",
    "familyTags": [
      "linhagem-sete"
    ],
    "relationships": []
  },
  {
    "id": "lameque-caim",
    "name": "Lameque (linhagem de Caim)",
    "lineage": "caim",
    "roles": [
      "linhagem",
      "genealogia"
    ],
    "unlockIndex": 320,
    "unlockHouse": 32,
    "asset": "assets/personagens/06_LAMEQUE_LINHAGEM_DE_CAIM.webp",
    "attributes": {
      "conhecimento": 0,
      "influencia": 4,
      "heranca": 0
    },
    "period": 1,
    "enabled": true,
    "unlockPhase": "GERACOES_CORRUPCAO",
    "familyTags": [
      "linhagem-caim"
    ],
    "relationships": []
  },
  {
    "id": "enoque-caim",
    "name": "Enoque (linhagem de Caim)",
    "lineage": "caim",
    "roles": [
      "linhagem",
      "genealogia",
      "construcao"
    ],
    "unlockIndex": 270,
    "unlockHouse": 27,
    "asset": "assets/personagens/07_ENOQUE_LINHAGEM_DE_CAIM.webp",
    "attributes": {
      "conhecimento": 2,
      "influencia": 3,
      "heranca": 1
    },
    "period": 1,
    "enabled": true,
    "unlockPhase": "GERACOES_CORRUPCAO",
    "familyTags": [
      "linhagem-caim"
    ],
    "relationships": []
  },
  {
    "id": "jabal",
    "name": "Jabal",
    "lineage": "caim",
    "roles": [
      "rebanho",
      "provisao",
      "linhagem"
    ],
    "unlockIndex": 290,
    "unlockHouse": 29,
    "asset": "assets/personagens/08_JABAL.webp",
    "attributes": {
      "conhecimento": 3,
      "influencia": 3,
      "heranca": 2
    },
    "period": 1,
    "enabled": true,
    "unlockPhase": "GERACOES_CORRUPCAO",
    "familyTags": [
      "linhagem-caim"
    ],
    "relationships": []
  },
  {
    "id": "jubal",
    "name": "Jubal",
    "lineage": "caim",
    "roles": [
      "linhagem",
      "influencia"
    ],
    "unlockIndex": 300,
    "unlockHouse": 30,
    "asset": "assets/personagens/09_JUBAL.webp",
    "attributes": {
      "conhecimento": 3,
      "influencia": 3,
      "heranca": 2
    },
    "period": 1,
    "enabled": true,
    "unlockPhase": "GERACOES_CORRUPCAO",
    "familyTags": [
      "linhagem-caim"
    ],
    "relationships": []
  },
  {
    "id": "tubalcaim",
    "name": "Tubalcaim",
    "lineage": "caim",
    "roles": [
      "construcao",
      "provisao",
      "linhagem"
    ],
    "unlockIndex": 310,
    "unlockHouse": 31,
    "asset": "assets/personagens/10_TUBALCAIM.webp",
    "attributes": {
      "conhecimento": 4,
      "influencia": 3,
      "heranca": 2
    },
    "period": 1,
    "enabled": true,
    "unlockPhase": "GERACOES_CORRUPCAO",
    "familyTags": [
      "linhagem-caim"
    ],
    "relationships": []
  },
  {
    "id": "enos",
    "name": "Enos",
    "lineage": "sete",
    "roles": [
      "linhagem",
      "genealogia",
      "fe-oferta"
    ],
    "unlockIndex": 340,
    "unlockHouse": 34,
    "asset": "assets/personagens/11_ENOS.webp",
    "attributes": {
      "conhecimento": 2,
      "influencia": 2,
      "heranca": 2
    },
    "period": 1,
    "enabled": true,
    "unlockPhase": "GERACOES_CORRUPCAO",
    "familyTags": [
      "linhagem-sete"
    ],
    "relationships": []
  },
  {
    "id": "enoque-sete",
    "name": "Enoque (linhagem de Sete)",
    "lineage": "sete",
    "roles": [
      "linhagem",
      "genealogia",
      "fe-oferta"
    ],
    "unlockIndex": 350,
    "unlockHouse": 35,
    "asset": "assets/personagens/12_ENOQUE_LINHAGEM_DE_SETE.webp",
    "attributes": {
      "conhecimento": 3,
      "influencia": 2,
      "heranca": 3
    },
    "period": 1,
    "enabled": true,
    "unlockPhase": "GERACOES_CORRUPCAO",
    "familyTags": [
      "linhagem-sete"
    ],
    "relationships": []
  },
  {
    "id": "matusalem",
    "name": "Matusalém",
    "lineage": "sete",
    "roles": [
      "linhagem",
      "genealogia"
    ],
    "unlockIndex": 360,
    "unlockHouse": 36,
    "asset": "assets/personagens/13_MATUSALEM.webp",
    "attributes": {
      "conhecimento": 3,
      "influencia": 2,
      "heranca": 4
    },
    "period": 1,
    "enabled": true,
    "unlockPhase": "GERACOES_CORRUPCAO",
    "familyTags": [
      "linhagem-sete"
    ],
    "relationships": []
  },
  {
    "id": "lameque-noe",
    "name": "Lameque (linhagem de Sete)",
    "lineage": "sete",
    "roles": [
      "linhagem",
      "genealogia"
    ],
    "unlockIndex": 360,
    "unlockHouse": 36,
    "asset": "assets/personagens/14_LAMEQUE_LINHAGEM_DE_SETE.webp",
    "attributes": {
      "conhecimento": 2,
      "influencia": 2,
      "heranca": 3
    },
    "period": 1,
    "enabled": true,
    "unlockPhase": "GERACOES_CORRUPCAO",
    "familyTags": [
      "linhagem-sete"
    ],
    "relationships": []
  },
  {
    "id": "noe",
    "name": "Noé",
    "lineage": "sete",
    "roles": [
      "linhagem",
      "genealogia",
      "construcao",
      "provisao",
      "fe-oferta"
    ],
    "unlockIndex": 400,
    "unlockHouse": 40,
    "asset": "assets/personagens/15_NOE.webp",
    "attributes": {
      "conhecimento": 3,
      "influencia": 3,
      "heranca": 4
    },
    "period": 1,
    "enabled": true,
    "unlockPhase": "NOE_ARCA",
    "familyTags": [
      "linhagem-sete"
    ],
    "relationships": []
  },
  {
    "id": "sem",
    "name": "Sem",
    "lineage": "noe",
    "roles": [
      "linhagem",
      "genealogia",
      "construcao",
      "provisao"
    ],
    "unlockIndex": 400,
    "unlockHouse": 40,
    "asset": "assets/personagens/16_SEM.webp",
    "attributes": {
      "conhecimento": 3,
      "influencia": 3,
      "heranca": 4
    },
    "period": 1,
    "enabled": true,
    "unlockPhase": "NOE_ARCA",
    "familyTags": [
      "familia-noe"
    ],
    "relationships": []
  },
  {
    "id": "cam",
    "name": "Cam",
    "lineage": "noe",
    "roles": [
      "linhagem",
      "genealogia",
      "construcao",
      "provisao"
    ],
    "unlockIndex": 400,
    "unlockHouse": 40,
    "asset": "assets/personagens/17_CA.webp",
    "attributes": {
      "conhecimento": 3,
      "influencia": 4,
      "heranca": 2
    },
    "period": 1,
    "enabled": true,
    "unlockPhase": "NOE_ARCA",
    "familyTags": [
      "familia-noe"
    ],
    "relationships": []
  },
  {
    "id": "jafe",
    "name": "Jafé",
    "lineage": "noe",
    "roles": [
      "linhagem",
      "genealogia",
      "construcao",
      "provisao"
    ],
    "unlockIndex": 400,
    "unlockHouse": 40,
    "asset": "assets/personagens/18_JAFE.webp",
    "attributes": {
      "conhecimento": 3,
      "influencia": 2,
      "heranca": 3
    },
    "period": 1,
    "enabled": true,
    "unlockPhase": "NOE_ARCA",
    "familyTags": [
      "familia-noe"
    ],
    "relationships": []
  },
  {
    "id": "esposa-noe",
    "name": "Esposa de Noé",
    "lineage": "noe",
    "roles": [
      "linhagem",
      "genealogia",
      "provisao",
      "preservacao"
    ],
    "unlockIndex": null,
    "unlockHouse": null,
    "unlockPhase": "NOE_ARCA",
    "asset": null,
    "attributes": null,
    "period": 1,
    "enabled": false,
    "familyTags": [
      "familia-noe",
      "arca",
      "preservacao"
    ],
    "relationships": [
      {
        "type": "spouse",
        "target": "noe"
      }
    ]
  },
  {
    "id": "esposa-sem",
    "name": "Esposa de Sem",
    "lineage": "noe",
    "roles": [
      "linhagem",
      "genealogia",
      "preservacao"
    ],
    "unlockIndex": null,
    "unlockHouse": null,
    "unlockPhase": "NOE_ARCA",
    "asset": null,
    "attributes": null,
    "period": 1,
    "enabled": false,
    "familyTags": [
      "familia-noe",
      "arca",
      "preservacao",
      "ramo-sem"
    ],
    "relationships": [
      {
        "type": "spouse",
        "target": "sem"
      }
    ]
  },
  {
    "id": "esposa-cam",
    "name": "Esposa de Cã",
    "lineage": "noe",
    "roles": [
      "linhagem",
      "genealogia",
      "preservacao"
    ],
    "unlockIndex": null,
    "unlockHouse": null,
    "unlockPhase": "NOE_ARCA",
    "asset": null,
    "attributes": null,
    "period": 1,
    "enabled": false,
    "familyTags": [
      "familia-noe",
      "arca",
      "preservacao",
      "ramo-cam"
    ],
    "relationships": [
      {
        "type": "spouse",
        "target": "cam"
      }
    ]
  },
  {
    "id": "esposa-jafe",
    "name": "Esposa de Jafé",
    "lineage": "noe",
    "roles": [
      "linhagem",
      "genealogia",
      "preservacao"
    ],
    "unlockIndex": null,
    "unlockHouse": null,
    "unlockPhase": "NOE_ARCA",
    "asset": null,
    "attributes": null,
    "period": 1,
    "enabled": false,
    "familyTags": [
      "familia-noe",
      "arca",
      "preservacao",
      "ramo-jafe"
    ],
    "relationships": [
      {
        "type": "spouse",
        "target": "jafe"
      }
    ]
  },
  {
    "id": "ada",
    "name": "Ada",
    "lineage": "caim",
    "roles": [
      "linhagem",
      "genealogia",
      "familia"
    ],
    "unlockIndex": null,
    "unlockHouse": null,
    "unlockPhase": "GERACOES_CORRUPCAO",
    "asset": null,
    "attributes": null,
    "period": 1,
    "enabled": false,
    "familyTags": [
      "linhagem-caim",
      "familia-lameque"
    ],
    "relationships": [
      {
        "type": "spouse",
        "target": "lameque-caim"
      },
      {
        "type": "mother",
        "target": "jabal"
      },
      {
        "type": "mother",
        "target": "jubal"
      }
    ]
  },
  {
    "id": "zila",
    "name": "Zilá",
    "lineage": "caim",
    "roles": [
      "linhagem",
      "genealogia",
      "familia"
    ],
    "unlockIndex": null,
    "unlockHouse": null,
    "unlockPhase": "GERACOES_CORRUPCAO",
    "asset": null,
    "attributes": null,
    "period": 1,
    "enabled": false,
    "familyTags": [
      "linhagem-caim",
      "familia-lameque"
    ],
    "relationships": [
      {
        "type": "spouse",
        "target": "lameque-caim"
      },
      {
        "type": "mother",
        "target": "tubalcaim"
      },
      {
        "type": "mother",
        "target": "naama"
      }
    ]
  },
  {
    "id": "naama",
    "name": "Naamá",
    "lineage": "caim",
    "roles": [
      "linhagem",
      "genealogia"
    ],
    "unlockIndex": null,
    "unlockHouse": null,
    "unlockPhase": "GERACOES_CORRUPCAO",
    "asset": null,
    "attributes": null,
    "period": 1,
    "enabled": false,
    "familyTags": [
      "linhagem-caim",
      "familia-lameque"
    ],
    "relationships": [
      {
        "type": "daughter",
        "target": "lameque-caim"
      },
      {
        "type": "daughter",
        "target": "zila"
      },
      {
        "type": "sibling",
        "target": "tubalcaim"
      }
    ]
  }
];

export const characters = characterCatalog.filter(c => c.enabled !== false);
export const plannedCharacters = characterCatalog.filter(c => c.enabled === false);

export function characterAvailableAtHouse(character, house){
  if(!character || character.enabled === false) return false;
  const currentHouse = Math.max(3, Number(house) || 1);
  if(Number.isInteger(character.unlockHouse)) return character.unlockHouse <= currentHouse;
  const start = PHASE_START_HOUSE[character.unlockPhase];
  return Number.isInteger(start) ? start <= currentHouse : false;
}

export function hasCharacterTag(character, tag){
  return Boolean(character && (
    character.lineage === tag ||
    character.roles?.includes(tag) ||
    character.familyTags?.includes(tag)
  ));
}
