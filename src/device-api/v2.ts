import { Response, Request, Router } from 'express';
import * as _ from 'lodash';

import ApplicationManager from '../application-manager';
import { doPurge, doRestart, serviceAction } from './common';

import { appNotFoundMessage, serviceNotFoundMessage } from '../lib/messages';

export function createV2Api(router: Router, applications: ApplicationManager) {

	const { _lockingIfNecessary } = applications;

	const handleServiceAction = (
		req: Request,
		res: Response,
		action: any,
	): Promise<void> => {
		const { imageId, force } = req.body;
		const { appId } = req.params;

		return _lockingIfNecessary(appId, { force }, () => {
			return applications.getCurrentApp(appId)
				.then((app) => {
					if (app == null) {
						res.status(404).send(appNotFoundMessage);
						return;
					}
					const service = _.find(app.services, { imageId });
					if (service == null) {
						res.status(404).send(serviceNotFoundMessage);
						return;
					}
					applications.setTargetVolatileForService(
						service.imageId,
						{ running: action !== 'stop' },
					);
					return applications.executeStepAction(
						serviceAction(
							action,
							service.serviceId,
							service,
							service,
							{ wait: true },
						),
						{ skipLock: true },
					)
						.then(() => {
							res.status(200).send('OK');
						});
				})
				.catch((err) => {
					let message;
					if (err != null) {
						if (err.message != null) {
							message = err.message;
						} else {
							message = err;
						}
					} else {
						message = 'Unknown error';
					}
					res.status(503).send(message);
				});
		});
	};

	router.post('/v2/applications/:appId/purge', (req: Request, res: Response) => {
		const { force } = req.body;
		const { appId } = req.params;

		return doPurge(applications, appId, force)
			.then(() => {
				res.status(200).send('OK');
			})
			.catch((err) => {
				let message;
				if (err != null) {
					message = err.message;
					if (message == null) {
						message = err;
					}
				} else {
					message = 'Unknown error';
				}
				res.status(503).send(message);
			});
	});

	router.post('/v2/applications/:appId/restart-service', (req: Request, res: Response) => {
		return handleServiceAction(req, res, 'restart');
	});

	router.post('/v2/applications/:appId/stop-service', (req: Request, res: Response) => {
		return handleServiceAction(req, res, 'stop');
	});

	router.post('/v2/applications/:appId/start-service', (req: Request, res: Response) => {
		return handleServiceAction(req, res, 'start');
	});

	router.post('/v2/applications/:appId/restart', (req: Request, res: Response) => {
		const { force } = req.body;
		const { appId } = req.params;

		return doRestart(applications, appId, force)
			.then(() => {
				res.status(200).send('OK');
			})
			.catch((err) => {
				let message;
				if (err != null) {
					message = err.message;
					if (message == null) {
						message = err;
					}
				} else {
					message = 'Unknown error';
				}
				res.status(503).send(message);
			});
	});
}
