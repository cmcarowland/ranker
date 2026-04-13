import type { BoardData } from '$lib/types';

export const initialBoardData: BoardData = {
	parks: [
		{
			id: '4ef57f20-f40b-4ea9-a47a-8cf00f20051b',
			name: 'Cedar Point',
			location: {
				city: 'Sandusky',
				region: 'Ohio',
				country: 'USA'
			},
			website: 'https://www.cedarpoint.com',
			openedYear: 1870
		},
		{
			id: 'f8a9e9cd-6520-4320-ae4e-f0be40a9e6ec',
			name: 'Kings Island',
			location: {
				city: 'Mason',
				region: 'Ohio',
				country: 'USA'
			},
			website: 'https://www.visitkingsisland.com',
			openedYear: 1972
		},
		{
			id: '95eabcc2-7ff8-4f3f-aa73-faf2716f7103',
			name: 'Dollywood',
			location: {
				city: 'Pigeon Forge',
				region: 'Tennessee',
				country: 'USA'
			},
			website: 'https://www.dollywood.com',
			openedYear: 1986
		}
	],
	coasters: [
		{
			id: 'fc690bad-a622-41f2-b9b2-f89dca85ef5d',
			name: 'Millennium Force',
			type: 'Giga',
			homeParkId: '4ef57f20-f40b-4ea9-a47a-8cf00f20051b',
			primaryColor: '#2B8CFF'
		},
		{
			id: 'e2f8e52f-c1eb-4ef1-bfc8-7a43ca9d84e9',
			name: 'Steel Vengeance',
			type: 'Hybrid',
			homeParkId: '4ef57f20-f40b-4ea9-a47a-8cf00f20051b',
			primaryColor: '#C24A2F'
		},
		{
			id: '267c4cd3-bff5-4f31-9e3a-83998a0e48bb',
			name: 'Diamondback',
			type: 'Hyper',
			homeParkId: 'f8a9e9cd-6520-4320-ae4e-f0be40a9e6ec',
			primaryColor: '#2A9D58'
		},
		{
			id: 'ebf97f68-75a6-4fcb-9755-f4429e339cb4',
			name: 'Mystic Timbers',
			type: 'Wooden',
			homeParkId: 'f8a9e9cd-6520-4320-ae4e-f0be40a9e6ec',
			primaryColor: '#8A5A3B'
		},
		{
			id: '9f1612f8-e7d9-4b5b-ba32-f709cbfd1177',
			name: 'Lightning Rod',
			type: 'Launched',
			homeParkId: '95eabcc2-7ff8-4f3f-aa73-faf2716f7103',
			primaryColor: '#E2A11A'
		},
		{
			id: '4d2441f9-0f0d-4f64-af2b-6f479d26c293',
			name: 'Wild Eagle',
			type: 'Inverted',
			homeParkId: '95eabcc2-7ff8-4f3f-aa73-faf2716f7103',
			primaryColor: '#6B5FD1'
		}
	],
	columns: {
		unridden: [
			'fc690bad-a622-41f2-b9b2-f89dca85ef5d',
			'e2f8e52f-c1eb-4ef1-bfc8-7a43ca9d84e9',
			'267c4cd3-bff5-4f31-9e3a-83998a0e48bb',
			'ebf97f68-75a6-4fcb-9755-f4429e339cb4',
			'9f1612f8-e7d9-4b5b-ba32-f709cbfd1177',
			'4d2441f9-0f0d-4f64-af2b-6f479d26c293'
		],
		ridden: []
	}
};
