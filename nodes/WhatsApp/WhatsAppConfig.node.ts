import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

export class WhatsAppConfig implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'WhatsApp Config',
		name: 'whatsAppConfig',
		icon: 'file:whatsapp.svg',
		group: ['transform'],
		version: 1,
		description: 'Configure which WhatsApp API to use in the workflow',
		defaults: {
			name: 'WhatsApp Config',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'whatsAppApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'API Provider',
				name: 'apiProvider',
				type: 'options',
				options: [
					{
						name: 'WhatsApp Official API (Meta)',
						value: 'official',
						description: 'Use WhatsApp Business API from Meta',
					},
					{
						name: 'Z-API',
						value: 'zapi',
						description: 'Use Z-API service',
					},
					{
						name: 'Evolution API',
						value: 'evolution',
						description: 'Use Evolution API',
					},
				],
				default: 'official',
				description: 'Select which API provider to use for WhatsApp messages',
			},
			{
				displayName: 'Info',
				name: 'notice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						apiProvider: ['official'],
					},
				},
			},
			{
				displayName: 'Info',
				name: 'zapiNotice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						apiProvider: ['zapi'],
					},
				},
			},
			{
				displayName: 'Info',
				name: 'evolutionNotice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						apiProvider: ['evolution'],
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const apiProvider = this.getNodeParameter('apiProvider', itemIndex) as string;
			const credentials = await this.getCredentials('whatsAppApi', itemIndex);

			const item = items[itemIndex];

			// Add configuration to item's JSON data
			item.json = {
				...item.json,
				whatsappConfig: {
					apiProvider,
					credentials: {
						// Only include relevant credentials based on selected provider
						...(apiProvider === 'official' && {
							accessToken: credentials.officialAccessToken,
							phoneNumberId: credentials.officialPhoneNumberId,
							businessAccountId: credentials.officialBusinessAccountId,
						}),
						...(apiProvider === 'zapi' && {
							instanceId: credentials.zapiInstanceId,
							token: credentials.zapiToken,
							clientToken: credentials.zapiClientToken,
							baseUrl: credentials.zapiBaseUrl,
						}),
						...(apiProvider === 'evolution' && {
							baseUrl: credentials.evolutionBaseUrl,
							apiKey: credentials.evolutionApiKey,
							instanceName: credentials.evolutionInstanceName,
						}),
					},
				},
			};

			returnData.push(item);
		}

		return [returnData];
	}
}
