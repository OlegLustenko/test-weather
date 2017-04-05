const soap = require('soap');
const xml2js = require('xml2js');
const promisify = require('es6-promisify');
const parseUrl = require('url').parse;
const { getWeatherByTime } = require('./helpers');

const createSoapClient = promisify(soap.createClient);
const parseXML = promisify(xml2js.parseString);

module.exports = async function api() {
  const url = 'https://graphical.weather.gov/xml/SOAP_server/ndfdXMLserver.php?wsdl';
  const client = await createSoapClient(url, {});

  async function cities(ctx) {
    const getCityList = promisify(client.LatLonListCityNames);
    const response = await getCityList({ displayLevel: 1234 });
    const res = await parseXML(response.listLatLonOut.$value);
    const cityList = res.dwml.cityNameList[0].split('|');
    const coordinates = res.dwml.latLonList[0].split(' ');

    const result = cityList.map((city, index) => {
      const [latitude, longitude] = coordinates[index].split(',');
      return {
        city,
        latitude,
        longitude,
      };
    });

    ctx.body = result;
  }

  async function forecast(ctx) {
    const getForecast = promisify(client.NDFDgenByDay);
    const { query: { lat, lon, start, days, unit, format } } = parseUrl(ctx.request.url, true);
    const response = await getForecast({
      latitude: lat,
      longitude: lon,
      startDate: start || new Date(),
      numDays: days || 7,
      Unit: unit || 'm',
      format: format || '24 hourly',
    });

    const result = await parseXML(response.dwmlByDayOut.$value);
    console.log(getWeatherByTime(result.dwml.data[0], new Date(2017, 3, 6, 16)));

    ctx.body = result.dwml.data;
  }

  return {
    cities,
    forecast,
  };
};
