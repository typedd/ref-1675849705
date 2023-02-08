// @flow
'use strict';
const settings = require('../settings')();
const log = require('@viaplay/logger')('Content', settings);

const kidsChannelMap = settings.kidsChannelMap;

const isAllowedDevice = function(deviceKey){
	if(deviceKey.device === 'atv'){
		return settings.enableTveChannelFilteringInAppleTv || false; // This will be toggled for SI only
	}else{
		return true;
	}
};

/* ::
import type {
    MspHATEOASResponse
} from '@msp/backend-types-flow/src/types';
*/

const getUsersPlayableTveChannels = function (requestData /* : any */, deviceKey /* : any */, channelGuids /* : any */, callback /* : any */) /* : any */ {
	const { createCallMspServiceMethodCommand } = require('../util/callMSPServiceStub')(log);
	const { createRequest: createGetUserPlayableTveChannelsRequest/* , circuitBreaker */ }
        = createCallMspServiceMethodCommand('user-epg', 'GetUserPlayableTveChannels', {});

	if (requestData.isLoggedIn() && isAllowedDevice(deviceKey)) {
		let guidsToCheck = channelGuids;
		if (requestData.profileData?.type === 'child') {
			const kidsChannels = kidsChannelMap[deviceKey.countryCode] || [];
			const setOfChannelsAvailable = new Set(guidsToCheck);
			guidsToCheck = kidsChannels.filter((channel) => setOfChannelsAvailable.has(channel));
		}
		if (guidsToCheck.length === 0){
			return setImmediate(callback, null, []);
		}

		const params = {
			userId: requestData.session.userId,
			brand: 'viaplay',
			deviceKey: deviceKey.key,
			guids: guidsToCheck.join(',')
		};

		const { request, params: reqparams } = createGetUserPlayableTveChannelsRequest/* :: < MspHATEOASResponse < any > > */(requestData)(
			params
		);

		return request(reqparams)
		.then(response => response.data)
		.then(userEpgResponse => {
			console.log({ userEpgResponse });
			callback(null, (userEpgResponse?.data?.channels || []));
		})
		.catch(userEpgErr => {
			const error = userEpgErr.message || userEpgErr;
			log.warning('user-epg returned error', {
				error,
				params: params,
			});
			callback(userEpgErr);
		})
		;
	} else {
		callback(null, channelGuids);
	}
};

module.exports = {
	getUsersPlayableTveChannels
};
