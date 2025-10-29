import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IHttpRequestOptions,
	IDataObject,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

interface WhatsAppConfig {
	apiProvider: string;
	credentials: IDataObject;
}

interface WhatsAppCredentials {
	accessToken?: string;
	phoneNumberId?: string;
	instanceId?: string;
	token?: string;
	clientToken?: string;
	baseUrl?: string;
	apiKey?: string;
	instanceName?: string;
}

export class WhatsAppSendMessage implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'WhatsApp Multi API Send Message',
		name: 'whatsAppSendMessage',
		icon: 'file:whatsapp.svg',
		group: ['output'],
		version: 1,
		description: 'Send WhatsApp messages using configured API provider',
		defaults: {
			name: 'WhatsApp Multi API Send Message',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		properties: [
			{
				displayName: 'Phone Number',
				name: 'phoneNumber',
				type: 'string',
				default: '',
				required: true,
				placeholder: '5511999999999',
				description: 'Recipient phone number with country code (no + or spaces)',
			},
			{
				displayName: 'Message Type',
				name: 'messageType',
				type: 'options',
				options: [
					{
						name: 'Audio',
						value: 'audio',
						description: 'Send an audio file',
					},
					{
						name: 'Button List',
						value: 'buttonList',
						description: 'Send an interactive list with buttons',
					},
					{
						name: 'Document',
						value: 'document',
						description: 'Send a document',
					},
					{
						name: 'Image',
						value: 'image',
						description: 'Send an image',
					},
					{
						name: 'Text',
						value: 'text',
						description: 'Send a text message',
					},
					{
						name: 'Video',
						value: 'video',
						description: 'Send a video',
					},
				],
				default: 'text',
				description: 'Type of message to send',
			},
			// Text message options
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				required: true,
				displayOptions: {
					show: {
						messageType: ['text'],
					},
				},
				description: 'Text message to send',
			},
			// Media options (image, document, audio, video)
			{
				displayName: 'Media URL',
				name: 'mediaUrl',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						messageType: ['image', 'document', 'audio', 'video'],
					},
				},
				description: 'URL of the media file to send',
			},
			{
				displayName: 'Caption',
				name: 'caption',
				type: 'string',
				typeOptions: {
					rows: 2,
				},
				default: '',
				displayOptions: {
					show: {
						messageType: ['image', 'video', 'document'],
					},
				},
				description: 'Optional caption for the media',
			},
			{
				displayName: 'Filename',
				name: 'filename',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						messageType: ['document'],
					},
				},
				description: 'Optional filename for the document',
			},
			// Button List options
			{
				displayName: 'List Title',
				name: 'listTitle',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						messageType: ['buttonList'],
					},
				},
				description: 'Title of the list (Evolution/Official) or main message (Z-API)',
			},
			{
				displayName: 'List Description',
				name: 'listDescription',
				type: 'string',
				typeOptions: {
					rows: 2,
				},
				default: '',
				displayOptions: {
					show: {
						messageType: ['buttonList'],
					},
				},
				description: 'Description/body text of the list (not used in Z-API)',
			},
			{
				displayName: 'Button Text',
				name: 'buttonText',
				type: 'string',
				default: 'Select an option',
				required: true,
				displayOptions: {
					show: {
						messageType: ['buttonList'],
					},
				},
				description: 'Text displayed on the button to open the list',
			},
			{
				displayName: 'Footer Text',
				name: 'footerText',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						messageType: ['buttonList'],
					},
				},
				description: 'Optional footer text for the list',
			},
			{
				displayName: 'List Sections',
				name: 'listSections',
				type: 'json',
				default: '[{"title":"Section 1","rows":[{"id":"1","title":"Option 1","description":"Description 1"}]}]',
				required: true,
				displayOptions: {
					show: {
						messageType: ['buttonList'],
					},
				},
				description: 'JSON array with sections and rows. Format: [{"title":"Section Title","rows":[{"id":"unique_id","title":"Row Title","description":"Row Description"}]}]',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const item = items[itemIndex];

				// Get WhatsApp configuration from previous WhatsAppConfig node
				const whatsappConfig = item.json.whatsappConfig as WhatsAppConfig;

				if (!whatsappConfig || !whatsappConfig.apiProvider) {
					throw new NodeOperationError(
						this.getNode(),
						'WhatsApp configuration not found. Please add a WhatsApp Config node before this node.',
						{ itemIndex }
					);
				}

				const phoneNumber = this.getNodeParameter('phoneNumber', itemIndex) as string;
				const messageType = this.getNodeParameter('messageType', itemIndex) as string;

				let responseData: IDataObject;

				switch (whatsappConfig.apiProvider) {
					case 'official':
						responseData = await sendWhatsAppOfficial.call(
							this,
							whatsappConfig.credentials,
							phoneNumber,
							messageType,
							itemIndex
						);
						break;
					case 'zapi':
						responseData = await sendZApi.call(
							this,
							whatsappConfig.credentials,
							phoneNumber,
							messageType,
							itemIndex
						);
						break;
					case 'evolution':
						responseData = await sendEvolutionApi.call(
							this,
							whatsappConfig.credentials,
							phoneNumber,
							messageType,
							itemIndex
						);
						break;
					default:
						throw new NodeOperationError(
							this.getNode(),
							`Unknown API provider: ${whatsappConfig.apiProvider}`,
							{ itemIndex }
						);
				}

				returnData.push({
					json: {
						...item.json,
						messageResponse: responseData,
						sentTo: phoneNumber,
						messageType,
						apiProvider: whatsappConfig.apiProvider,
					},
					pairedItem: itemIndex,
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
						},
						pairedItem: itemIndex,
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}

async function sendWhatsAppOfficial(
		this: IExecuteFunctions,
		credentials: IDataObject,
		phoneNumber: string,
		messageType: string,
		itemIndex: number
	): Promise<IDataObject> {
		const { accessToken, phoneNumberId } = credentials as WhatsAppCredentials;

		const baseUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

		const messageBody: IDataObject = {
			messaging_product: 'whatsapp',
			to: phoneNumber,
		};

		if (messageType === 'text') {
			const message = this.getNodeParameter('message', itemIndex) as string;
			messageBody.type = 'text';
			messageBody.text = { body: message };
		} else if (messageType === 'buttonList') {
			const listTitle = this.getNodeParameter('listTitle', itemIndex) as string;
			const listDescription = this.getNodeParameter('listDescription', itemIndex) as string;
			const buttonText = this.getNodeParameter('buttonText', itemIndex) as string;
			const footerText = this.getNodeParameter('footerText', itemIndex, '') as string;
			const listSectionsJson = this.getNodeParameter('listSections', itemIndex) as string;

			let listSections;
			try {
				listSections = JSON.parse(listSectionsJson);
			} catch (error) {
				throw new NodeOperationError(
					this.getNode(),
					'Invalid JSON format for List Sections',
					{ itemIndex }
				);
			}

			messageBody.type = 'interactive';
			messageBody.interactive = {
				type: 'list',
				body: {
					text: listDescription || listTitle,
				},
				action: {
					button: buttonText,
					sections: listSections.map((section: any) => ({
						title: section.title,
						rows: section.rows.map((row: any) => ({
							id: row.id,
							title: row.title,
							description: row.description || '',
						})),
					})),
				},
			};

			if (listTitle && listDescription) {
				(messageBody.interactive as IDataObject).header = {
					type: 'text',
					text: listTitle,
				};
			}

			if (footerText) {
				(messageBody.interactive as IDataObject).footer = {
					text: footerText,
				};
			}
		} else {
			const mediaUrl = this.getNodeParameter('mediaUrl', itemIndex) as string;
			const caption = this.getNodeParameter('caption', itemIndex, '') as string;

			messageBody.type = messageType;
			const mediaObject: IDataObject = {
				link: mediaUrl,
			};

			if (caption && ['image', 'video', 'document'].includes(messageType)) {
				mediaObject.caption = caption;
			}

			if (messageType === 'document') {
				const filename = this.getNodeParameter('filename', itemIndex, '') as string;
				if (filename) {
					mediaObject.filename = filename;
				}
			}

			messageBody[messageType] = mediaObject;
		}

		const options: IHttpRequestOptions = {
			method: 'POST',
			url: baseUrl,
			headers: {
				'Authorization': `Bearer ${accessToken}`,
				'Content-Type': 'application/json',
			},
			body: messageBody,
			json: true,
		};

		return await this.helpers.httpRequest(options);
}

async function sendZApi(
		this: IExecuteFunctions,
		credentials: IDataObject,
		phoneNumber: string,
		messageType: string,
		itemIndex: number
	): Promise<IDataObject> {
		const { instanceId, token, clientToken, baseUrl } = credentials as WhatsAppCredentials;

		let endpoint = '';
		const messageBody: IDataObject = {
			phone: phoneNumber,
		};

		if (messageType === 'text') {
			endpoint = `${baseUrl}/instances/${instanceId}/token/${token}/send-text`;
			const message = this.getNodeParameter('message', itemIndex) as string;
			messageBody.message = message;
		} else if (messageType === 'buttonList') {
			endpoint = `${baseUrl}/instances/${instanceId}/token/${token}/send-button-list`;
			const listTitle = this.getNodeParameter('listTitle', itemIndex) as string;
			const listSectionsJson = this.getNodeParameter('listSections', itemIndex) as string;

			let listSections;
			try {
				listSections = JSON.parse(listSectionsJson);
			} catch (error) {
				throw new NodeOperationError(
					this.getNode(),
					'Invalid JSON format for List Sections',
					{ itemIndex }
				);
			}

			// Z-API uses a flat list of buttons
			const buttons: IDataObject[] = [];
			listSections.forEach((section: any) => {
				section.rows.forEach((row: any) => {
					buttons.push({
						id: row.id,
						label: row.title,
					});
				});
			});

			messageBody.message = listTitle;
			messageBody.buttonList = {
				buttons: buttons,
			};
		} else {
			const mediaUrl = this.getNodeParameter('mediaUrl', itemIndex) as string;

			switch (messageType) {
				case 'image':
					endpoint = `${baseUrl}/instances/${instanceId}/token/${token}/send-image`;
					messageBody.image = mediaUrl;
					break;
				case 'document':
					endpoint = `${baseUrl}/instances/${instanceId}/token/${token}/send-document`;
					messageBody.document = mediaUrl;
					break;
				case 'audio':
					endpoint = `${baseUrl}/instances/${instanceId}/token/${token}/send-audio`;
					messageBody.audio = mediaUrl;
					break;
				case 'video':
					endpoint = `${baseUrl}/instances/${instanceId}/token/${token}/send-video`;
					messageBody.video = mediaUrl;
					break;
			}

			const caption = this.getNodeParameter('caption', itemIndex, '') as string;
			if (caption && ['image', 'video', 'document'].includes(messageType)) {
				messageBody.caption = caption;
			}
		}

		const options: IHttpRequestOptions = {
			method: 'POST',
			url: endpoint,
			headers: {
				'Content-Type': 'application/json',
				'Client-Token': clientToken,
			},
			body: messageBody,
			json: true,
		};

		return await this.helpers.httpRequest(options);
}

async function sendEvolutionApi(
		this: IExecuteFunctions,
		credentials: IDataObject,
		phoneNumber: string,
		messageType: string,
		itemIndex: number
	): Promise<IDataObject> {
		const { baseUrl, apiKey, instanceName } = credentials as WhatsAppCredentials;

		let endpoint = '';

		const messageBody: IDataObject = {
			number: phoneNumber,
		};

		if (messageType === 'text') {
			endpoint = `${baseUrl}/message/sendText/${instanceName}`;
			const message = this.getNodeParameter('message', itemIndex) as string;
			messageBody.text = message;
		} else if (messageType === 'buttonList') {
			endpoint = `${baseUrl}/message/sendList/${instanceName}`;
			const listTitle = this.getNodeParameter('listTitle', itemIndex) as string;
			const listDescription = this.getNodeParameter('listDescription', itemIndex) as string;
			const buttonText = this.getNodeParameter('buttonText', itemIndex) as string;
			const footerText = this.getNodeParameter('footerText', itemIndex, '') as string;
			const listSectionsJson = this.getNodeParameter('listSections', itemIndex) as string;

			let listSections;
			try {
				listSections = JSON.parse(listSectionsJson);
			} catch (error) {
				throw new NodeOperationError(
					this.getNode(),
					'Invalid JSON format for List Sections',
					{ itemIndex }
				);
			}

			// Evolution API format
			messageBody.title = listTitle;
			messageBody.description = listDescription || listTitle;
			messageBody.buttonText = buttonText;
			messageBody.footerText = footerText;
			messageBody.values = listSections.map((section: any) => ({
				title: section.title,
				rows: section.rows.map((row: any) => ({
					title: row.title,
					description: row.description || '',
					rowId: row.id,
				})),
			}));
		} else {
			endpoint = `${baseUrl}/message/sendMedia/${instanceName}`;
			const mediaUrl = this.getNodeParameter('mediaUrl', itemIndex) as string;
			const caption = this.getNodeParameter('caption', itemIndex, '') as string;

			// Determinar o mimetype baseado no tipo de mensagem
			let mimetype = '';
			switch (messageType) {
				case 'image':
					mimetype = 'image/png';
					break;
				case 'document':
					mimetype = 'application/pdf';
					break;
				case 'audio':
					mimetype = 'audio/mp3';
					break;
				case 'video':
					mimetype = 'video/mp4';
					break;
			}

			messageBody.mediatype = messageType;
			messageBody.mimetype = mimetype;
			messageBody.media = mediaUrl;
			messageBody.caption = caption || '';

			// Adicionar fileName para documentos
			if (messageType === 'document') {
				const filename = this.getNodeParameter('filename', itemIndex, '') as string;
				messageBody.fileName = filename || 'document.pdf';
			} else {
				messageBody.fileName = `file.${messageType === 'image' ? 'png' : messageType === 'audio' ? 'mp3' : 'mp4'}`;
			}
		}

		const options: IHttpRequestOptions = {
			method: 'POST',
			url: endpoint,
			headers: {
				'Content-Type': 'application/json',
				'apikey': apiKey,
			},
			body: messageBody,
			json: true,
		};

		return await this.helpers.httpRequest(options);
}
