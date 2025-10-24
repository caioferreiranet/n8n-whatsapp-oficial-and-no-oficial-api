import type {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class WhatsAppApi implements ICredentialType {
	name = 'whatsAppApi';

	displayName = 'WhatsApp API';

	documentationUrl = 'https://developers.facebook.com/docs/whatsapp';

	properties: INodeProperties[] = [
		{
			displayName: 'Info',
			name: 'notice',
			type: 'notice',
			default: 'Configure one or more WhatsApp API providers below. You only need to fill in the credentials for the provider(s) you plan to use.',
		},
		// WhatsApp Official API
		{
			displayName: 'Access Token',
			name: 'officialAccessToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'Access token for WhatsApp Official API (Meta)',
		},
		{
			displayName: 'Phone Number ID',
			name: 'officialPhoneNumberId',
			type: 'string',
			default: '',
			description: 'Phone number ID from WhatsApp Business API',
		},
		{
			displayName: 'Business Account ID',
			name: 'officialBusinessAccountId',
			type: 'string',
			default: '',
			description: 'WhatsApp Business Account ID',
		},
		// Z-API
		{
			displayName: 'Instance ID',
			name: 'zapiInstanceId',
			type: 'string',
			default: '',
			description: 'Z-API Instance ID',
		},
		{
			displayName: 'API Token',
			name: 'zapiToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'Z-API authentication token',
		},
		{
			displayName: 'Client Token',
			name: 'zapiClientToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'Z-API client token',
		},
		{
			displayName: 'Base URL',
			name: 'zapiBaseUrl',
			type: 'string',
			default: 'https://api.z-api.io',
			description: 'Z-API base URL',
		},
		// Evolution API
		{
			displayName: 'Base URL',
			name: 'evolutionBaseUrl',
			type: 'string',
			default: '',
			placeholder: 'https://your-evolution-api.com',
			description: 'Evolution API base URL',
		},
		{
			displayName: 'API Key',
			name: 'evolutionApiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'Evolution API key for authentication',
		},
		{
			displayName: 'Instance Name',
			name: 'evolutionInstanceName',
			type: 'string',
			default: '',
			description: 'Evolution API instance name',
		},
	];
}
