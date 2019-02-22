const axios = require('axios')
const qs = require('qs')

async function getJson(url) {
  const response = await axios.get(url)

  return response.data
}

function goal(user, authToken, goal) {
  return {

    datapoints: async () => {
      url = `https://www.beeminder.com/api/v1/users/${user}/goals/${goal}/datapoints.json?auth_token=${authToken}`
      return getJson(url)
    },

    createDatapoint: async (datapoint) => {
      url = `https://www.beeminder.com/api/v1/users/${user}/goals/${goal}/datapoints.json`
      result = await axios.post(
        url,
        qs.stringify({ ...datapoint, auth_token: authToken }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      )
      return result.data.id
    },

    updateDatapoint: async (datapoint) => {
      url = `https://www.beeminder.com/api/v1/users/${user}/goals/${goal}/datapoints/${datapoint.id}.json`
      return axios.put(
        url,
        qs.stringify({ ...datapoint, auth_token: authToken }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      )
    },

    deleteDatapoint: async (id) => {
      url = `https://www.beeminder.com/api/v1/users/${user}/goals/${goal}/datapoints/${id}.json?auth_token=${authToken}`
      return axios.delete(url)
    },

  }
}

module.exports = { goal };
