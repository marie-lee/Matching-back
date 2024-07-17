const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('../config/db/db');

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: 'http://localhost:8080/api/member/registeration/join/google',
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const { id, emails, displayName } = profile;
      let user = await db.TB_USER.findOne({ where: { USER_EMAIL: emails[0].value } });

      if (!user) {
        user = await db.TB_USER.create({
          USER_NM: displayName,
          USER_EMAIL: emails[0].value,
          USER_PW: '',
          LOGIN_TYPE: 'GOOGLE',
          PHONE,
          UID: id,
          REFRESH_TOKEN: '',
          DEVICE_TOKEN: '',
          CREATED_DT: new Date(),
          MODIFIED_DT: new Date(),
        });
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));
// strategy.js
GoogleStrategy.prototype.parseErrorResponse = function(body, status) {
  var json;
  try {
    json = JSON.parse(body);
  } catch (_) {
    return null;
  }

  if (json.error) {
    console.error('OAuth2 Error:', json);
    return new TokenError(json.error_description, json.error, json.error_uri);
  }
  return null;
};

// oauth2.js
GoogleStrategy.prototype.getOAuthAccessToken = function(code, params, callback) {
  var params = params || {};
  params.client_id = this._clientId;
  params.client_secret = this._clientSecret;
  var codeParam = (params.grant_type === 'refresh_token') ? 'refresh_token' : 'code';
  params[codeParam] = code;

  var post_data = querystring.stringify(params);
  var post_headers = {
    'Content-Type': 'application/x-www-form-urlencoded'
  };

  this._request("POST", this._getAccessTokenUrl(), post_headers, post_data, null, function(error, data, response) {
    if (error) {
      console.error('OAuth2 Token Error:', error);
      callback(error);
    } else {
      var results;
      try {
        results = JSON.parse(data);
      } catch (e) {
        console.error('Error parsing OAuth2 response:', e);
        callback(e);
        return;
      }
      var access_token = results.access_token;
      var refresh_token = results.refresh_token;
      delete results.refresh_token;
      callback(null, access_token, refresh_token, results);
    }
  });
};

module.exports = passport;
