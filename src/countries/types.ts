export type CountryId = string;

export type Continent = { id: string; name: string };

export type Country = {
  id: CountryId;
  name: string;
  nativeName: string;
  continent: Continent;
  capital: string;
  languages: string[];
  currencies: string[];
};
