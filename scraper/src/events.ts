interface ICountry {
    baseUrl: string;
    country: string;
    events: string[];
}

export type CountryCode = keyof typeof PARKRUN_EVENTS_PER_COUNTRY;

export const PARKRUN_EVENTS_PER_COUNTRY: Record<string, ICountry> = {
    FI: {
        baseUrl: "https://www.parkrun.fi",
        country: "Finland",
        events: [
            "mattilanniemi",
            "puolarmaari",
            "tokoinranta",
            "pokkinen",
            "lahdensatama",
            "vaaksynkanava",
            "tampere",
            "urheilupuisto",
            "porinmetsa"
        ]
    },
    SE: {
        baseUrl: "https://www.parkrun.se",
        country: "Sweden",
        events: [
            "malmoribersborg",
            "vaxjosjon",
            "billdalsparken",
            "skatas",
            "vallaskogen",
            "orebro",
            "huddinge",
            "judarskogen",
            "haga",
            "lillsjon",
            "uppsala",
            "broparken"
        ]
    },
    NO: {
        baseUrl: "https://www.parkrun.no",
        country: "Norway",
        events: [
            "festningen",
            "loftsgardsbrua",
            "ankerskogen",
            "lovstien",
            "stavanger",
            "skienfritidspark",
            "albygard",
            "nansenparken",
            "bergerstadion",
            "ekebergsletta",
            "toyen",
            "greveskogen"
        ]
    },
    DK: {
        baseUrl: "https://www.parkrun.dk",
        country: "Denmark",
        events: [
            "amagerstrandpark",
            "faelledparken",
            "amager",
            "damhusengen",
            "esbjerg",
            "vejen",
            "bygholm",
            "fuglsangso",
            "brabrand",
            "nordrefaelled",
            "nibe"
        ]
    }
};