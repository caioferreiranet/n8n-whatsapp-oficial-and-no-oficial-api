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
		displayName: 'WhatsApp Send Message',
		name: 'whatsAppSendMessage',
		icon: 'file:whatsapp.svg',
		group: ['output'],
		version: 1,
		description: 'Send WhatsApp messages using configured API provider',
		defaults: {
			name: 'WhatsApp Send Message',
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

		const endpoint = `${baseUrl}/message/sendText/${instanceName}`;

		const messageBody: IDataObject = {
			number: phoneNumber,
		};

		if (messageType === 'text') {
			const message = this.getNodeParameter('message', itemIndex) as string;
			messageBody.textMessage = {
				text: message,
			};
		} else {
			const mediaUrl = this.getNodeParameter('mediaUrl', itemIndex) as string;
			const caption = this.getNodeParameter('caption', itemIndex, '') as string;

			switch (messageType) {
				case 'image': {
					const imageMessage: IDataObject = {
						mediatype: 'image',
						media: mediaUrl,
					};
					if (caption) imageMessage.caption = caption;
					messageBody.mediaMessage = imageMessage;
					break;
				}
				case 'document': {
					const docMessage: IDataObject = {
						mediatype: 'document',
						media: mediaUrl,
					};
					if (caption) docMessage.caption = caption;
					const filename = this.getNodeParameter('filename', itemIndex, '') as string;
					if (filename) docMessage.fileName = filename;
					messageBody.mediaMessage = docMessage;
					break;
				}
				case 'audio':
					messageBody.audioMessage = {
						audio: mediaUrl,
					};
					break;
				case 'video': {
					const videoMessage: IDataObject = {
						mediatype: 'video',
						media: mediaUrl,
					};
					if (caption) videoMessage.caption = caption;
					messageBody.mediaMessage = videoMessage;
					break;
				}
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
