import re
from datetime import datetime, date as dt_date
from typing import Dict, Any, List

RAW_LPJ_DATA = """1	IKPT	2026-07	Week-1		21 Jul 2026	1-11100 Petty Cash Project	Uang Masuk	5.000.000,00	1				5.000.000,00
2	IKPT	2026-07	Week-1		21 Jul 2026	5-46200 Extra Food	snake dan minum		1	porsi	15.000,00	15.000,00	4.985.000,00
3	IKPT	2026-07	Week-1		21 Jul 2026	5-43000 Transportasi Darat	Transportasi whoos Bandung ke jkt		1	trip	295.000,00	295.000,00	4.690.000,00
4	IKPT	2026-07	Week-1		21 Jul 2026	5-43000 Transportasi Darat	Grab dari halim ke kantor		1	trip	220.000,00	220.000,00	4.470.000,00
5	IKPT	2026-07	Week-1		22 Jul 2026	5-43000 Transportasi Darat	Grab dari kantor ke bandara+e-toll		1	trip	250.000,00	250.000,00	4.220.000,00
6	IKPT	2026-07	Week-1		22 Jul 2026	5-46100 Pembelian Makan & Minum	makan di perjalanan menuju site 3 orang		3	porsi	29.000,00	87.000,00	4.133.000,00
7	IKPT	2026-07	Week-1		22 Jul 2026	5-46100 Pembelian Makan & Minum	beli air aqua		1	btl	10.000,00	10.000,00	4.123.000,00
8	IKPT	2026-07	Week-1		23 Jul 2026	5-46100 Pembelian Makan & Minum	makan di warung		6	porsi	27.000,00	162.000,00	3.961.000,00
9	IKPT	2026-07	Week-1		23 Jul 2026	5-46200 Extra Food	beli aqua dan snake		1	pac	38.000,00	38.000,00	3.923.000,00
10	IKPT	2026-07	Week-1		24 Jul 2026	5-46100 Pembelian Makan & Minum	makan di warung		9	porsi	24.500,00	220.500,00	3.702.500,00
11	IKPT	2026-07	Week-1		24 Jul 2026	5-17310 Biaya Pemeriksaan Kesehatan	Pendaftaran RSUD		1	resi	79.500,00	79.500,00	3.623.000,00
12	IKPT	2026-07	Week-1		24 Jul 2026	5-17310 Biaya Pemeriksaan Kesehatan	Cek gula darah di laboratorium		1	paket	245.500,00	245.500,00	3.377.500,00
13	IKPT	2026-07	Week-1		24 Jul 2026	5-17311 Obat-Obatan dan Biaya Pengobatan	Obat Gula dan Tensi darah		1	pac	218.000,00	218.000,00	3.159.500,00
14	IKPT	2026-07	Week-1		24 Jul 2026	5-46100 Pembelian Makan & Minum	Makan di Warung		7	porsi	24.000,00	168.000,00	2.991.500,00
15	IKPT	2026-07	Week-1		24 Jul 2026	5-46200 Extra Food	beli air aqua dan snake		2	btl/bks	20.000,00	40.000,00	2.951.500,00
16	IKPT	2026-07	Week-1		24 Jul 2026	5-17450 Perlengkapan Mess/Camp	laundry		3,5	kg	7.000,00	24.500,00	2.927.000,00
17	IKPT	2026-07	Week-1		25 Jul 2026	5-46100 Pembelian Makan & Minum	Makan di Warung		3	porsi	22.000,00	66.000,00	2.861.000,00
18	IKPT	2026-07	Week-1		25 Jul 2026	5-46200 Extra Food	beli air + snake		1	bag	36.000,00	36.000,00	2.825.000,00
19	IKPT	2026-07	Week-1		25 Jul 2026	5-17450 Perlengkapan Mess/Camp	laundry		1	kg	7.000,00	7.000,00	2.818.000,00
20	IKPT	2026-07	Week-1		26 Jul 2026	5-46100 Pembelian Makan & Minum	Makan di Warung		4	porsi	29.000,00	116.000,00	2.702.000,00
21	IKPT	2026-07	Week-1		27 Jul 2026	5-46100 Pembelian Makan & Minum	Makan di Warung		5	porsi	24.000,00	120.000,00	2.582.000,00
22	IKPT	2026-07	Week-1		27 Jul 2026	5-13200 Bahan Bakar Jenis Bensin Operasional Kendaraan	BBM INNOVA		24,39	liter	20.500,00	500.000,00	2.082.000,00
23	IKPT	2026-07	Week-2		28 Jul 2026	5-46100 Pembelian Makan & Minum	Makan di Warung		4	porsi	25.000,00	100.000,00	1.982.000,00
24	IKPT	2026-07	Week-2		28 Jul 2026	5-46100 Pembelian Makan & Minum	beli air galon		1	galon	10.000,00	10.000,00	1.972.000,00
25	IKPT	2026-07	Week-2		28 Jul 2026	5-17450 Perlengkapan Mess/Camp	laundry		2,5	kg	7.000,00	17.500,00	1.954.500,00
26	IKPT	2026-07	Week-2		29 Jul 2026	5-46100 Pembelian Makan & Minum	Makan di Warung		6	porsi	22.000,00	132.000,00	1.822.500,00
27	IKPT	2026-07	Week-2		29 Jul 2026	5-14200 Bahan Bakar Jenis Diesel Operasional Kendaraan	BBM LV HILUX		24,39	liter	20.500,00	500.000,00	1.322.500,00
28	IKPT	2026-07	Week-2		29 Jul 2026	5-46200 Extra Food	Beli buah anggur		1	bgks	30.000,00	30.000,00	1.292.500,00
29	IKPT	2026-07	Week-2		30 Jul 2026	5-46100 Pembelian Makan & Minum	Makan di Warung		6	porsi	25.000,00	150.000,00	1.142.500,00
30	IKPT	2026-07	Week-2		31 Jul 2026	5-46100 Pembelian Makan & Minum	Makan di Warung		5	porsi	26.000,00	130.000,00	1.012.500,00
31	IKPT	2026-07	Week-2		31 Jul 2026	5-46200 Extra Food	buah anggur		1	bgks	30.000,00	30.000,00	982.500,00
32	IKPT	2026-07	Week-2		31 Jul 2026	5-14200 Bahan Bakar Jenis Diesel Operasional Kendaraan	BBM LV HILUX		24,39	liter	20.500,00	500.000,00	482.500,00
33	IKPT	2026-07	Week-2		31 Jul 2026	5-17450 Perlengkapan Mess/Camp	laundry		3	kg	7.000,00	21.000,00	461.500,00
34	IKPT	2026-08	Week-2		01 Agu 2026	5-46100 Pembelian Makan & Minum	Makan di Warung		5	porsi	22.000,00	110.000,00	351.500,00
35	IKPT	2026-08	Week-2		01 Agu 2026	5-46200 Extra Food	Beli buah pepaya dan semangka		2	ptg	5.000,00	10.000,00	341.500,00
36	IKPT	2026-08	Week-2		01 Agu 2026	5-17500 Biaya Operasional Lainnya	stempel SMI		1	pcs	80.000,00	80.000,00	261.500,00
37	IKPT	2026-08	Week-2		02 Agu 2026	5-46100 Pembelian Makan & Minum	Warung makan Family		6	porsi	26.800,00	160.800,00	100.700,00
38	IKPT	2026-08	Week-2		02 Agu 2026	5-46200 Extra Food	Beli buah anggur		1	bgks	30.000,00	30.000,00	70.700,00
39	IKPT	2026-08	Week-2		03 Agu 2026	5-46100 Pembelian Makan & Minum	Warung makan Salero		5	porsi	25.000,00	125.000,00	(54.300,00)
40	IKPT	2026-08	Week-2		03 Agu 2026	5-46200 Extra Food	martabak		2	porsi	18.000,00	36.000,00	(90.300,00)
41	IKPT	2026-08	Week-2		03 Agu 2026	5-32210 Insentif	Transfer Nino Calon QC		1	kali	100.000,00	100.000,00	(190.300,00)
42	IKPT	2026-08	Week-2		03 Agu 2026	5-17450 Perlengkapan Mess/Camp	laundry		2	kg	7.000,00	14.000,00	(204.300,00)
43	IKPT	2026-08	Week-3		04 Agu 2026	5-46100 Pembelian Makan & Minum	Warung makan Iciak		4	porsi	25.000,00	100.000,00	(304.300,00)
44	IKPT	2026-08	Week-3		04 Agu 2026	5-17310 Biaya Pemeriksaan Kesehatan	bayar surat sehat Rinaldi		1	lembar	35.000,00	35.000,00	(339.300,00)
45	IKPT	2026-08	Week-3		04 Agu 2026	5-14200 Bahan Bakar Jenis Diesel Operasional Kendaraan	BBM LV		24,39	liter	20.500,00	500.000,00	(839.300,00)
46	IKPT	2026-08	Week-3		05 Agu 2026	5-17311 Obat-Obatan dan Biaya Pengobatan	Beli tolak angin 1 box+roti		1	box	64.000,00	64.000,00	(903.300,00)
47	IKPT	2026-08	Week-3		05 Agu 2026	5-46200 Extra Food	beli anggur		1	bgks	30.000,00	30.000,00	(933.300,00)
48	IKPT	2026-08	Week-3		06 Agu 2026	5-46100 Pembelian Makan & Minum	Warung makan Iciak		3	porsi	25.000,00	75.000,00	(1.008.300,00)
49	IKPT	2026-08	Week-3		06 Agu 2026	5-17450 Perlengkapan Mess/Camp	laundry		2	kg	7.000,00	14.000,00	(1.022.300,00)
50	IKPT	2026-08	Week-3		07 Agu 2026	5-46100 Pembelian Makan & Minum	Warung makan Ananda		4	porsi	20.000,00	80.000,00	(1.102.300,00)
51	IKPT	2026-08	Week-3		08 Agu 2026	1-11100 Petty Cash Project	Uang Masuk	3.000.000,00				0,00	1.897.700,00
52	IKPT	2026-08	Week-3		08 Agu 2026	5-46100 Pembelian Makan & Minum	Warung makan Bunda		4	porsi	20.000,00	80.000,00	1.817.700,00
53	IKPT	2026-08	Week-3		08 Agu 2026	5-17450 Perlengkapan Mess/Camp	laundry		1	kg	7.000,00	7.000,00	1.810.700,00
54	IKPT	2026-08	Week-3		10 Agu 2026	1-11100 Petty Cash Project	Uang Masuk	2.000.000,00				0,00	3.810.700,00
55	IKPT	2026-08	Week-3		10 Agu 2026	5-46100 Pembelian Makan & Minum	Warung makan		4	porsi	21.000,00	84.000,00	3.726.700,00
56	IKPT	2026-08	Week-3		10 Agu 2026	5-17310 Biaya Pemeriksaan Kesehatan	daftar RSUD		1		79.500,00	79.500,00	3.647.200,00
57	IKPT	2026-08	Week-3		10 Agu 2026	5-17310 Biaya Pemeriksaan Kesehatan	Lab Gula Darah		1		201.000,00	201.000,00	3.446.200,00
58	IKPT	2026-08	Week-3		10 Agu 2026	5-46200 Extra Food	Snake dan minum		2	btl/bks	10.000,00	20.000,00	3.426.200,00
59	IKPT	2026-08	Week-3		10 Agu 2026	5-17310 Biaya Pemeriksaan Kesehatan	Bayar surat sehat RSUD Dugie		1	LS	200.000,00	200.000,00	3.226.200,00
60	IKPT	2026-08	Week-4		11 Agu 2026	5-46100 Pembelian Makan & Minum	Warung makan		10	porsi	22.000,00	220.000,00	3.006.200,00
61	IKPT	2026-08	Week-4		11 Agu 2026	5-47000 Sewa Mess/Pembuatan Camp	Bayar DP mesh		3	kamar	1.000.000,00	3.000.000,00	6.200,00
62	IKPT	2026-08	Week-4		11 Agu 2026	5-17310 Biaya Pemeriksaan Kesehatan	Bayar surat sehat RSUD Saifullah		1	LS	20.000,00	20.000,00	(13.800,00)
63	IKPT	2026-08	Week-4		11 Agu 2026	5-46200 Extra Food	snake + buah anggur		1,5	ptg/bgks	30.000,00	45.000,00	(58.800,00)
64	IKPT	2026-08	Week-4		12 Agu 2026	5-46100 Pembelian Makan & Minum	Warung Makan		4	porsi	21.000,00	84.000,00	(142.800,00)
65	IKPT	2026-08	Week-4		12 Agu 2026	5-46200 Extra Food	Snake		15	bgks	2.000,00	30.000,00	(172.800,00)
66	IKPT	2026-08	Week-4		13 Agu 2026	5-46100 Pembelian Makan & Minum	Warung Makan		5	porsi	19.000,00	95.000,00	(267.800,00)
67	IKPT	2026-08	Week-4		13 Agu 2026	5-17450 Perlengkapan Mess/Camp	laundry		3	kg	7.000,00	21.000,00	(288.800,00)
68	IKPT	2026-08	Week-4		13 Agu 2026	1-11100 Petty Cash Project	Uang Masuk	5.000.000,00				0,00	4.711.200,00
69	IKPT	2026-08	Week-4		14 Agu 2026	5-46100 Pembelian Makan & Minum	Warung Makan		5	porsi	18.000,00	90.000,00	4.621.200,00
70	IKPT	2026-08	Week-4		14 Agu 2026	5-17311 Obat-Obatan dan Biaya Pengobatan	Obat Apotek		1	paket/strip	111.000,00	111.000,00	4.510.200,00
71	IKPT	2026-08	Week-4		15 Agu 2026	5-46100 Pembelian Makan & Minum	Warung Makan Padang, Bebek Saung		3	porsi	186.000,00	558.000,00	3.952.200,00
72	IKPT	2026-08	Week-4		15 Agu 2026	5-43000 Transportasi Darat	bayar travel tim bor		1	LS	1.000.000,00	1.000.000,00	2.952.200,00
73	IKPT	2026-08	Week-4		15 Agu 2026	5-41200 Sewa Kendaraan Harian	mobil ke padang		1,2	hari	650.000,00	780.000,00	2.172.200,00
74	IKPT	2026-08	Week-4		15 Agu 2026	5-13200 Bahan Bakar Jenis Bensin Operasional Kendaraan	BBM mobil ke padang		40	liter	10.000,00	400.000,00	1.772.200,00
75	IKPT	2026-08	Week-4		15 Agu 2026	5-17120 Material Lainnya	Beli jangka sorong		1	pcs	380.000,00	380.000,00	1.392.200,00
76	IKPT	2026-08	Week-4		15 Agu 2026	5-46100 Pembelian Makan & Minum	Warung Makan		3	porsi	18.000,00	54.000,00	1.338.200,00
77	IKPT	2026-08	Week-4		15 Agu 2026	5-17120 Material Lainnya	Beli terminal 2 pcs		2	pcs	38.000,00	76.000,00	1.262.200,00
78	IKPT	2026-08	Week-4		15 Agu 2026	5-17450 Perlengkapan Mess/Camp	laundry		3	kg	7.000,00	21.000,00	1.241.200,00
79	IKPT	2026-08	Week-4		15 Agu 2026	5-46100 Pembelian Makan & Minum	Warung Makan		3	porsi	20.000,00	60.000,00	1.181.200,00
80	IKPT	2026-08	Week-5		18 Agu 2026	5-46200 Extra Food	buah anggur		1	bgks	30.000,00	30.000,00	1.151.200,00
81	IKPT	2026-09	Week-8		08 Sep 2026		koreksi kesalahan		1	bks	1.151.200,00	1.151.200,00	0,00
82	IKPT	2026-08	Week-5		19 Agu 2026	1-11100 Petty Cash Project	Uang Masuk (Rek : Riska)	17.500.000,00				0,00	17.500.000,00
83	IKPT	2026-08	Week-5		19 Agu 2026	5-46200 Extra Food	Rokok Crew Bore (6 Orang)		6	slop	250.000,00	1.500.000,00	16.000.000,00
84	IKPT	2026-08	Week-5		20 Agu 2026	5-17450 Perlengkapan Mess/Camp	Teko Listrik		2	pcs	135.000,00	270.000,00	15.730.000,00
85	IKPT	2026-08	Week-5		19 Agu 2026	5-17450 Perlengkapan Mess/Camp	Pengadaan Kasur Crew Bore		9	pcs	250.000,00	2.250.000,00	13.480.000,00
86	IKPT	2026-08	Week-5		19 Agu 2026	5-17450 Perlengkapan Mess/Camp	Bantal Crew Bore		15	pcs	40.000,00	600.000,00	12.880.000,00
87	IKPT	2026-08	Week-5		21 Agu 2026	6-31600 Biaya Kurir dan Pengiriman	Ongkos Kirim Kasur & Bantal		1	jasa	150.000,00	150.000,00	12.730.000,00
88	IKPT	2026-08	Week-5		21 Agu 2026	5-17311 Obat-Obatan dan Biaya Pengobatan	Belanja Obat-Obatan		1	sett	258.000,00	258.000,00	12.472.000,00
89	IKPT	2026-08	Week-5		21 Agu 2026	5-17450 Perlengkapan Mess/Camp	Belanja Sabun Cuci + Sikat		1	sett	174.000,00	174.000,00	12.298.000,00
90	IKPT	2026-08	Week-5		21 Agu 2026	5-17313 APD dan Kelengkapan K3 Lainnya	Card Holder Crew Bore		20	sett	17.500,00	350.000,00	11.948.000,00
91	IKPT	2026-08	Week-5		21 Agu 2026	5-17500 Biaya Operasional Lainnya	Print + Fotocopy Rekap Makan Crew Bore		1	sett	65.000,00	65.000,00	11.883.000,00
92	IKPT	2026-08	Week-5		21 Agu 2026	5-17500 Biaya Operasional Lainnya	Perlengkapan ATK (Spidoll + Pulpen + Stabillo DLL)		1	sett	278.000,00	278.000,00	11.605.000,00
93	IKPT	2026-08	Week-5		21 Agu 2026	5-17500 Biaya Operasional Lainnya	Papan Bore Point (Print + Laminating)		5	pcs	12.000,00	60.000,00	11.545.000,00
94	IKPT	2026-08	Week-5		21 Agu 2026	5-46200 Extra Food	Beli Gula + Kopi + Teh + Susu (Stok)		1	sett	276.000,00	276.000,00	11.269.000,00
95	IKPT	2026-08	Week-5		21 Agu 2026	5-17450 Perlengkapan Mess/Camp	Ember Untuk Cuci		5	pcs	37.500,00	187.500,00	11.081.500,00
96	IKPT	2026-08	Week-5		21 Agu 2026	5-17450 Perlengkapan Mess/Camp	Sapu (2) + Kain Pell (1)		1	sett	148.000,00	148.000,00	10.933.500,00
97	IKPT	2026-08	Week-5		18 Agu 2026	5-17450 Perlengkapan Mess/Camp	Cangkir Plastik Crew Bore		12	pcs	7.500,00	90.000,00	10.843.500,00
98	IKPT	2026-08	Week-5		18 Agu 2026	5-17120 Material Lainnya	Palu		1	pcs	35.000,00	35.000,00	10.808.500,00
99	IKPT	2026-08	Week-5		21 Agu 2026	5-17120 Material Lainnya	Terminal Listrik		2	pcs	48.000,00	96.000,00	10.712.500,00
100	IKPT	2026-08	Week-5		22 Agu 2026	5-22000 Biaya Pengiriman Sample	Perjalanan Uji Lab Muara Laboh - Padang		1	nota	3.630.000,00	3.630.000,00	7.082.500,00
101	IKPT	2026-08	Week-5		22 Agu 2026	5-47000 Sewa Mess/Pembuatan Camp	Unit Shelter		2	pcs	1.686.000,00	3.372.000,00	3.710.500,00
102	IKPT	2026-08	Week-5		24 Agu 2026	5-43000 Transportasi Darat	Biaya Travel Tim Bore (13 Orang - Selasa, 25 Agustus 2026)		13	orang	150.000,00	1.950.000,00	1.760.500,00
103	IKPT	2026-08	Week-6		25 Agu 2026	5-46100 Pembelian Makan & Minum	Bayar Makan Tim On Site (9 Orang - 16 s.d 22 AGUSTUS 2026)		1	nota	1.760.000,00	1.760.000,00	500,00
104	IKPT	2026-08	Week-6		25 Agu 2026	1-11100 Petty Cash Project	OPS 23 Agustus - 2 September 2026	28.600.000,00				0,00	28.600.500,00
105	IKPT	2026-08	Week-6		25 Agu 2026	5-46100 Pembelian Makan & Minum	Pelunasan Uang Makan s.d 22 Agustus 2026		1	nota	2.884.000,00	2.884.000,00	25.716.500,00
106	IKPT	2026-08	Week-6		25 Agu 2026	5-46200 Extra Food	Rokok Crew Bore (19 Orang) 26 Agustus - 4 Sept 2026		19	nota	250.000,00	4.750.000,00	20.966.500,00
107	IKPT	2026-08	Week-5		24 Agu 2026	5-17500 Biaya Operasional Lainnya	Perlengkapan ATK		1	nota	400.000,00	400.000,00	20.566.500,00
108	IKPT	2026-08	Week-6		26 Agu 2026	5-17450 Perlengkapan Mess/Camp	Kotak Sampah & Dustbin Bag		1	nota	211.000,00	211.000,00	20.355.500,00
109	IKPT	2026-08	Week-6		26 Agu 2026	5-17120 Material Lainnya	Perlengkapan Material Lapangan		1	nota	445.000,00	445.000,00	19.910.500,00
110	IKPT	2026-08	Week-6		26 Agu 2026	5-46100 Pembelian Makan & Minum	Box Makan Staff & Crew Washbore (CGE)		23	nota	37.500,00	862.500,00	19.048.000,00
111	IKPT	2026-08	Week-6		25 Agu 2026	5-17311 Obat-Obatan dan Biaya Pengobatan	Obat - Obatan All Crew		1	nota	238.000,00	238.000,00	18.810.000,00
112	IKPT	2026-08	Week-6		25 Agu 2026	5-13300 Bahan Bakar Jenis Bensin Penggunaan Lainnya	Belanja Bahan Bakar Chainsaw		10	liter	27.500,00	275.000,00	18.535.000,00
113	IKPT	2026-08	Week-6		25 Agu 2026	5-15500 Oli dan Pelumas Penggunaan Lain	Oli Chainsaw		5	liter	45.000,00	225.000,00	18.310.000,00
114	IKPT	2026-08	Week-6		25 Agu 2026	5-46100 Pembelian Makan & Minum	Makan, Minum & Rokok Pak Petra (Operator Chainsaw)		1	nota	75.000,00	75.000,00	18.235.000,00
115	IKPT	2026-08	Week-6		25 Agu 2026	5-46100 Pembelian Makan & Minum	Biaya Stand by Sopir truk (Makan, Rokok & Minum)		1	nota	478.000,00	478.000,00	17.757.000,00
116	IKPT	2026-08	Week-6		25 Agu 2026	5-17220 Biaya Pemeliharaan Kendaraan	Biaya Tambal Ban Truk Yang Bocor		1	nota	140.000,00	140.000,00	17.617.000,00
117	IKPT	2026-08	Week-6		25 Agu 2026	5-46200 Extra Food	Inspeksi Mesin By IKPT (Pak KIKI) Rokok, Minum & Snack		1	nota	150.000,00	150.000,00	17.467.000,00
118	IKPT	2026-08	Week-6		25 Agu 2026	5-46100 Pembelian Makan & Minum	Makan Staff & Crew Washbore (23 Agustus - 2 September 2026)		660	orang	24.000,00	15.840.000,00	1.627.000,00
119	IKPT	2026-08	Week-6		25 Agu 2026	5-17450 Perlengkapan Mess/Camp	Sabun Cuci Baju (Crew Washbore)		2	dus	125.000,00	250.000,00	1.377.000,00
120	IKPT	2026-08	Week-6		26 Agu 2026	5-17450 Perlengkapan Mess/Camp	Laundry (3 Orang Staf)		30	kg	9.000,00	270.000,00	1.107.000,00
121	IKPT	2026-08	Week-6		28 Agu 2026	5-15200 Suku Cadang Operasional Pemboran	Seal untuk selang		20	pcs	12.500,00	250.000,00	857.000,00
122	IKPT	2026-08	Week-6		26 Agu 2026	5-46200 Extra Food	Inspeksi Mesin By SEML (Pak ARYO) Rokok, Minum & Snack		1	nota	150.000,00	150.000,00	707.000,00
123	IKPT	2026-09	Week-7		01 Sep 2026	5-12100 Mobilisasi Mesin dan Peralatan	Jasa Drop Mesin di Camp IKPT (TMC) - 3 Orang		1	nota	225.000,00	225.000,00	482.000,00
124	IKPT	2026-09	Week-7		01 Sep 2026	1-11100 Petty Cash Project	OPS Material Spillback & Peralatan Las	4.093.000,00				0,00	4.575.000,00
125	IKPT	2026-09	Week-7		01 Sep 2026	5-17120 Material Lainnya	Material Spillback		1	nota	2.400.000,00	2.400.000,00	2.175.000,00
126	IKPT	2026-09	Week-7		01 Sep 2026	5-17120 Material Lainnya	Perlengkapan di Lapangan		1	nota	355.000,00	355.000,00	1.820.000,00
127	IKPT	2026-09	Week-7		01 Sep 2026	5-17120 Material Lainnya	Belanja Perlengkapan Las		1	nota	863.000,00	863.000,00	957.000,00
128	IKPT	2026-09	Week-7		01 Sep 2026	5-17210 Biaya Pemeliharaan Mesin dan Peralatan Pemboran	Biaya Peralatan Chainsaw + Jasa Modif Mata Chainsaw		1	nota	600.000,00	600.000,00	357.000,00
129	IKPT	2026-09	Week-7		04 Sep 2026	5-13300 Bahan Bakar Jenis Bensin Penggunaan Lainnya	BBM Chainsaw, Oli kotor, Oli bersih, Busi, dan Kikir		1	nota	303.000,00	303.000,00	54.000,00
130	IKPT	2026-09	Week-7		04 Sep 2026	1-11100 Petty Cash Project	Uang Masuk (OPS Pengajuan 02 September 2026)	25.000.000,00				0,00	25.054.000,00
131	IKPT	2026-09	Week-7		04 Sep 2026	5-46200 Extra Food	JATAH ROKOK TIM BORE/10 HARI (5 Sep - 14 Sep 2026)		1	nota	4.750.000,00	4.750.000,00	20.304.000,00
132	IKPT	2026-09	Week-7		04 Sep 2026	5-46100 Pembelian Makan & Minum	BIAYA MAKAN & MINUM (TIM BORE, ENGINEER)		1	nota	15.840.000,00	15.840.000,00	4.464.000,00
133	IKPT	2026-09	Week-7		04 Sep 2026	5-15200 Suku Cadang Operasional Pemboran	Recoil Starter Chainsaw		1	nota	80.000,00	80.000,00	4.384.000,00
134	IKPT	2026-09	Week-7		04 Sep 2026	5-13000 Biaya Bahan Bakar	BBM Genset & Gerigen (Las Spilbak)		1	nota	123.000,00	123.000,00	4.261.000,00
135	IKPT	2026-09	Week-7		04 Sep 2026	5-17450 Perlengkapan Mess/Camp	Termos Air Panas		2	pcs	148.000,00	296.000,00	3.965.000,00
136	IKPT	2026-09	Week-7		04 Sep 2026	5-46000 Biaya Makan & Minum	Galon Air Minum		16	pcs	12.500,00	200.000,00	3.765.000,00
137	IKPT	2026-09	Week-7		06 Sep 2026		Karung Sand Bag (20 Kg)		35	pcs	11.750,00	411.250,00	3.353.750,00
138	IKPT	2026-09	Week-7		06 Sep 2026		Karung Sand Bag (50 Kg)		20	pcs	15.500,00	310.000,00	3.043.750,00
139	IKPT	2026-09	Week-7		07 Sep 2026	5-13000 Biaya Bahan Bakar	BBM Genset		15	liter	15.000,00	225.000,00	2.818.750,00
140	IKPT	2026-09	Week-8		08 Sep 2026	5-17450 Perlengkapan Mess/Camp	Laundry (2 Orang Staff)		20	kg	9.000,00	180.000,00	2.638.750,00
141	IKPT	2026-09	Week-8		09 Sep 2026	5-17450 Perlengkapan Mess/Camp	SABUN CUCI TIM BORE (2 - 12 Sep 2026)		2	dus	125.000,00	250.000,00	2.388.750,00
142	IKPT	2026-09	Week-7		05 Sep 2026		ATK		1	nota	62.000,00	62.000,00	2.326.750,00
143	IKPT	2026-09	Week-7		05 Sep 2026		Peralatan di lapangan		1	nota	1.073.000,00	1.073.000,00	1.253.750,00
144	IKPT	2026-09	Week-7		06 Sep 2026	5-17312 Alat Kesehatan, P3K	Obat Demam, Sakit Gigi dan Flu Batuk		1	nota	356.000,00	356.000,00	897.750,00
145	IKPT	2026-09	Week-8		09 Sep 2026	5-46200 Extra Food	Belanja Rokok dan Minum (Operator + Ass TMC)		3	orang 	48.000,00	144.000,00	753.750,00
146	IKPT	2026-09	Week-8		09 Sep 2026	5-46200 Extra Food	Rokok & Minum Pak Kiki (Inspeksi +  Ganti Stiker Biru ke Kuning)		1	orang 	75.000,00	75.000,00	678.750,00
147	IKPT	2026-09	Week-8		09 Sep 2026	5-17450 Perlengkapan Mess/Camp	Karpet Alas Lantai Rolling Door		2	buah	265.000,00	530.000,00	148.750,00
149	IKPT	2026-09	Week-8		09/09/2026	5-17000 Biaya Perlengkapan Proyek	Perlengkapan Untuk Trial Drilling (SP-75)		1	nota	2.083.000,00	2.083.000,00	613.750,00	IKPT-00149
150	IKPT	2026-09	Week-8		10/09/2026	5-13000 Biaya Bahan Bakar	Solar 1 Galon 		30	liter 	15.500,00	465.000,00	148.750,00	IKPT-00150
151	IKPT	2026-09	Week-8		12/09/2026	1-11100 Petty Cash Project	Kas Masuk	30.500.000,00				0,00	30.648.750,00	IKPT-00151
152	IKPT	2026-09	Week-8		14/09/2026	5-46200 Extra Food	JATAH ROKOK TIM BORE/10 HARI (15 Sep - 24 Sep 2026)		1	nota	4.750.000,00	4.750.000,00	25.898.750,00	IKPT-00152
153	IKPT	2026-09	Week-8		14/09/2026	5-46100 Pembelian Makan & Minum	BIAYA MAKAN & MINUM (TIM BORE, ENGINEER)		1	nota	15.120.000,00	15.120.000,00	10.778.750,00	IKPT-00153
154	IKPT	2026-09	Week-8		14/09/2026	5-15200 Suku Cadang Operasional Pemboran	OLI 10		20	liter	65.000,00	1.300.000,00	9.478.750,00	IKPT-00154
155	IKPT	2026-09	Week-8		14/09/2026	5-17210 Perlengkapan dan Peralatan Rig	KEPERLUAN UNTUK MATA BOR CORING (PIPA BESI 14" &  10")		1	Nota	2.000.000,00	2.000.000,00	7.478.750,00	IKPT-00155
156	IKPT	2026-09	Week-8		14/09/2026	5-17120 Pembelian Material Lainnya	PAKU SEDANG & BESAR 		1	Nota	250.000,00	250.000,00	7.228.750,00	IKPT-00156
157	IKPT	2026-09	Week-8		14/09/2026	5-17120 Pembelian Material Lainnya	BELANJA PARALON DAN KARUNG 		1	Nota	400.000,00	400.000,00	6.828.750,00	IKPT-00157
158	IKPT	2026-09	Week-8		14/09/2026	5-17450 Perlengkapan Mess/Camp	LAUNDRY (Eng : 2 Orang) (2 - 12 Sep 2026)		20	Kg	9.000,00	180.000,00	6.648.750,00	IKPT-00158
159	IKPT	2026-09	Week-8		14/09/2026	5-17450 Perlengkapan Mess/Camp	SABUN CUCI TIM BORE (2 - 12 Sep 2026)		1	Dus	125.000,00	125.000,00	6.523.750,00	IKPT-00159
160	IKPT	2026-09	Week-8		14/09/2026	5-13000 Biaya Bahan Bakar	BAHAN BAKAR GENSET LAS KECIL (PERTALITE)		1	Nota	500.000,00	500.000,00	6.023.750,00	IKPT-00160
161	IKPT	2026-09	Week-8		14/09/2026	5-13000 Biaya Bahan Bakar	SOLAR (Est. 30 Liter / Hari) (11 - 20 September 2026) 1 Unit Mesin Bore		200	Liter	15.500,00	3.100.000,00	2.923.750,00	IKPT-00161
164	IKPT	2026-09	Week-8		14/09/2026	5-13000 Biaya Bahan Bakar	Solar Mesin Bor (30 Liter)		30	liter	15.500,00	465.000,00	75.750,00	IKPT-00164"""

MONTHS_ID = {
    "Jul": "07", "Agu": "08", "Sep": "09", "Okt": "10", "Nov": "11", "Des": "12"
}

def parse_num(s: str) -> float:
    s = s.strip().replace('Rp', '').replace('.', '').replace(',', '.').strip()
    return float(s)

def parse_date(d_str: str) -> str:
    d_str = d_str.strip()
    if '/' in d_str:
        parts = d_str.split('/')
        if len(parts) == 3:
            return f"{parts[2]}-{parts[1].zfill(2)}-{parts[0].zfill(2)}"
    parts = d_str.split()
    if len(parts) == 3:
        day = parts[0].zfill(2)
        m = MONTHS_ID.get(parts[1], "01")
        yr = parts[2]
        return f"{yr}-{m}-{day}"
    return "2026-08-01"

def get_lpj_week_info(iso_date: str):
    d = datetime.strptime(iso_date, "%Y-%m-%d").date()
    if d <= dt_date(2026, 7, 19):
        return 1, "W1 (13-19 Jul)", "13 Jul – 19 Jul 2026"
    elif d <= dt_date(2026, 7, 26):
        return 2, "W2 (20-26 Jul)", "20 Jul – 26 Jul 2026"
    elif d <= dt_date(2026, 8, 2):
        return 3, "W3 (27 Jul-02 Agu)", "27 Jul – 02 Agu 2026"
    elif d <= dt_date(2026, 8, 9):
        return 4, "W4 (03-09 Agu)", "03 Agu – 09 Agu 2026"
    elif d <= dt_date(2026, 8, 16):
        return 5, "W5 (10-16 Agu)", "10 Agu – 16 Agu 2026"
    elif d <= dt_date(2026, 8, 23):
        return 6, "W6 (17-23 Agu)", "17 Agu – 23 Agu 2026"
    elif d <= dt_date(2026, 8, 30):
        return 7, "W7 (24-30 Agu)", "24 Agu – 30 Agu 2026"
    elif d <= dt_date(2026, 9, 6):
        return 8, "W8 (31 Agu-06 Sep)", "31 Agu – 06 Sep 2026"
    elif d <= dt_date(2026, 9, 13):
        return 9, "W9 (07-13 Sep)", "07 Sep – 13 Sep 2026"
    else:
        return 10, "W10 (14-20 Sep)", "14 Sep – 20 Sep 2026"

def map_lpj_to_category(coa_code: str, memo: str):
    text = f"{coa_code} {memo}".lower()
    if any(k in text for k in ['5-17310', 'pemeriksaan kesehatan', 'rsud', 'gula darah', 'surat sehat', '5-17312', 'alat kesehatan', 'obat', '5-17311', 'p3k']):
        return "KAT-01", "MCU + BPJS"
    if any(k in text for k in ['5-17210', 'chainsaw', '5-15200', 'suku cadang', 'seal untuk selang', 'trial drilling', 'mata bor', 'coring']):
        return "KAT-03", "Preparasi Rig"
    if any(k in text for k in ['5-43000', 'transportasi', 'whoos', 'grab', 'travel', '5-12100', 'mobilisasi', '6-31600', 'kurir']):
        return "KAT-04", "Mobilisasi Personil, Rig, Material"
    if any(k in text for k in ['5-46100', '5-46200', '5-46000', 'makan', 'minum', 'extra food', 'rokok', 'buah', 'aqua', '5-47000', 'sewa mess', 'camp', 'shelter']):
        return "KAT-05", "Akomodasi & Meals"
    if any(k in text for k in ['spillback', 'spillbak', 'sand bag', 'karung', 'las', '5-17120', 'material lainnya', 'jangka sorong', 'terminal', 'oli', 'paku', 'paralon']):
        return "KAT-09", "Consumable"
    if any(k in text for k in ['5-32210', 'insentif', 'gaji']):
        return "KAT-08", "Gaji Personil"
    return "KAT-10", "Operasional"

def get_coa_for_lpj(coa_desc: str, memo: str):
    if coa_desc and coa_desc.strip():
        c_code_clean = coa_desc.split()[0].replace('-', '')
        c_name_clean = " ".join(coa_desc.split()[1:]) if len(coa_desc.split()) > 1 else "Beban Operasional Proyek"
        return c_code_clean, c_name_clean
    text = memo.lower()
    if 'rokok' in text:
        return '54620', 'Biaya Extra Food & Rokok'
    if 'makan' in text or 'minum' in text:
        return '54610', 'Pembelian Makan & Minum'
    if 'oli' in text:
        return '51200', 'Biaya Material & Consumables'
    if 'mata bor' in text or 'coring' in text or 'trial drilling' in text:
        return '51721', 'Perlengkapan dan Peralatan Rig'
    if 'paku' in text or 'paralon' in text or 'karung' in text:
        return '51200', 'Biaya Material & Consumables'
    if 'laundry' in text or 'sabun' in text:
        return '51745', 'Perlengkapan Mess/Camp'
    if 'solar' in text or 'diesel' in text:
        return '51420', 'Bahan Bakar Solar / Diesel'
    if 'pertalite' in text or 'bensin' in text:
        return '51320', 'Bahan Bakar Bensin Operasional'
    return '51200', 'Biaya Material & Consumables Proyek'

def generate_copy1_data(base_cashflow: Dict[str, Any]) -> Dict[str, Any]:
    """
    Builds Copy 1 (Realisasi Aktual Lapangan / Kas Kecil)
    Replaces gross lump-sum bank transfers with detailed actual on-site transactions,
    while retaining bank admin fees and all standard non-operational transactions.
    """
    proj_code = base_cashflow.get("project", {}).get("code", "") or ""
    if "IKPT" not in proj_code:
        # Copy 1 LPJ is currently only available for IKPT Solok
        res = dict(base_cashflow)
        res["copy1_available"] = False
        res["copy1_message"] = "Laporan Copy 1 (Realisasi Kas Kecil LPJ Lapangan) saat ini khusus tersedia untuk proyek Borpile & Struktur - IKPT Solok."
        return res

    CATEGORY_ORDER = [
        {"code": "INFLOW-01", "name": "[BARU] Penerimaan Kas (Termin Proyek)", "is_new": True, "flow": "INFLOW"},
        {"code": "KAT-01", "name": "MCU + BPJS", "is_new": False, "flow": "OUTFLOW"},
        {"code": "KAT-02", "name": "Sucofindo + Uji Material", "is_new": False, "flow": "OUTFLOW"},
        {"code": "KAT-03", "name": "Preparasi Rig", "is_new": False, "flow": "OUTFLOW"},
        {"code": "KAT-04", "name": "Mobilisasi Personil, Rig, Material", "is_new": False, "flow": "OUTFLOW"},
        {"code": "KAT-05", "name": "Akomodasi & Meals", "is_new": False, "flow": "OUTFLOW"},
        {"code": "KAT-06", "name": "Rental Rig", "is_new": False, "flow": "OUTFLOW"},
        {"code": "KAT-07", "name": "Material", "is_new": False, "flow": "OUTFLOW"},
        {"code": "KAT-08", "name": "Gaji Personil", "is_new": False, "flow": "OUTFLOW"},
        {"code": "KAT-09", "name": "Consumable", "is_new": False, "flow": "OUTFLOW"},
        {"code": "KAT-10", "name": "Operasional", "is_new": False, "flow": "OUTFLOW"},
        {"code": "KAT-11", "name": "Lain-Lain", "is_new": False, "flow": "OUTFLOW"},
        {"code": "KAT-BARU-01", "name": "[BARU] Kasbon Personil / Tim Lapangan", "is_new": True, "flow": "OUTFLOW"},
    ]

    # 1. Parse LPJ Actual Expenses
    lpj_items = []
    lines = RAW_LPJ_DATA.strip().split('\n')
    for line in lines:
        parts = line.split('\t')
        if len(parts) < 8:
            continue
        line_no = parts[0].strip()
        memo = parts[7].strip()
        coa_desc = parts[6].strip()
        dt_str = parts[5].strip()
        
        # Skip inflow lines
        if "1-11100" in coa_desc or "Kas Masuk" in memo or "Uang Masuk" in memo or "OPS 23" in memo or "OPS Material" in memo:
            continue
            
        iso_d = parse_date(dt_str)
        w_num, w_lbl, w_range = get_lpj_week_info(iso_d)
        
        amounts = []
        for p in parts:
            p_clean = p.strip().replace('Rp', '').strip()
            if re.match(r'^\d{1,3}(\.\d{3})*(,\d{2})?$', p_clean) and len(p_clean) >= 3:
                try:
                    amounts.append(parse_num(p_clean))
                except:
                    pass
        # Actual expense amount (second to last if running balance present)
        amt = amounts[-2] if len(amounts) >= 2 else (amounts[-1] if amounts else 0.0)
        
        cat_code, cat_name = map_lpj_to_category(coa_desc, memo)
        c_code_clean, c_name_clean = get_coa_for_lpj(coa_desc, memo)
        voucher = parts[-1].strip() if len(parts) > 13 and parts[-1].strip().startswith("IKPT-") else f"LPJ-{line_no.zfill(3)}"

        lpj_items.append({
            "journal_id": None,
            "journal_number": voucher,
            "is_lpj": True,
            "date": iso_d,
            "week_num": w_num,
            "week_label": w_lbl,
            "flow": "OUTFLOW",
            "amount": amt,
            "category": cat_name,
            "cat_code": cat_code,
            "is_new": False,
            "coa_code": c_code_clean,
            "coa_name": c_name_clean,
            "description": f"[LPJ Riil Lapangan] {memo} ({coa_desc})" if coa_desc else f"[LPJ Riil Lapangan] {memo}",
            "lpj_detail": {
                "line_no": line_no,
                "memo": memo,
                "coa_desc": coa_desc,
                "date_raw": dt_str,
                "qty": parts[8].strip() if len(parts) > 8 else "-",
                "unit": parts[9].strip() if len(parts) > 9 else "-",
                "unit_price": parse_num(parts[10]) if len(parts) > 10 and parts[10].strip() else amt,
            }
        })

    # 2. Filter base transactions to replace the 9 lump sums
    target_lumpsums = [
        ("2026-07-21", 5002500.0),
        ("2026-08-07", 2002500.0),
        ("2026-08-10", 3002500.0),
        ("2026-08-13", 5002500.0),
        ("2026-08-15", 17502500.0),
        ("2026-08-25", 28602500.0),
        ("2026-08-31", 4095500.0),
        ("2026-09-04", 25002500.0),
        ("2026-09-12", 30502500.0),
    ]

    def match_target(t):
        if t["flow"] != "OUTFLOW":
            return False
        for dt, amt in target_lumpsums:
            if t["date"] == dt and abs(t["amount"] - amt) < 10:
                return True
        return False

    retained_tx = []
    for t in base_cashflow["transactions"]:
        if match_target(t):
            # Retain the Rp 2.500 transfer bank admin fee as actual bank outflow in KAT-11 Lain-Lain
            retained_tx.append({
                "journal_id": t.get("journal_id"),
                "journal_number": f"{t.get('journal_number', '')}-ADM",
                "ref_id": t.get("ref_id"),
                "ref_type": "AdminFee",
                "status": "Posted",
                "attachment_path": t.get("attachment_path"),
                "attachment_memo": t.get("attachment_memo"),
                "lines": [
                    {"account_code": "72100", "account_name": "Biaya Administrasi Bank", "description": f"Biaya Admin Bank BI-Fast - {t.get('journal_number', '')}", "debit": 2500.0, "credit": 0.0},
                    {"account_code": "11210", "account_name": "Bank Mandiri IDR", "description": "Admin Fee Bank Mandiri", "debit": 0.0, "credit": 2500.0}
                ],
                "date": t["date"],
                "week_num": t["week_num"],
                "week_label": t["week_label"],
                "flow": "OUTFLOW",
                "amount": 2500.0,
                "category": "Lain-Lain",
                "cat_code": "KAT-11",
                "is_new": False,
                "coa_code": "72100",
                "coa_name": "Biaya Administrasi Bank",
                "description": f"Biaya Admin Bank (BI-Fast) - {t['description']}"
            })
        else:
            retained_tx.append(t)

    # 3. Combine base retained + LPJ items
    all_copy1_tx = retained_tx + lpj_items
    all_copy1_tx.sort(key=lambda x: (x["date"], x.get("journal_number", "")))

    # 4. Compute weeks_list for Copy 1
    weeks_dict = {}
    for w in range(1, 11):
        sample_date = (
            "2026-07-13" if w == 1 else
            "2026-07-21" if w == 2 else
            "2026-07-28" if w == 3 else
            "2026-08-05" if w == 4 else
            "2026-08-12" if w == 5 else
            "2026-08-20" if w == 6 else
            "2026-08-25" if w == 7 else
            "2026-09-02" if w == 8 else
            "2026-09-09" if w == 9 else
            "2026-09-14"
        )
        _, label, drange = get_lpj_week_info(sample_date)
        weeks_dict[w] = {
            "week_num": w,
            "label": label,
            "date_range": drange,
            "inflow": 0.0,
            "outflow": 0.0,
            "net": 0.0,
            "cumulative": 0.0,
            "category_amounts": {c["name"]: 0.0 for c in CATEGORY_ORDER if c["flow"] == "OUTFLOW"},
            "coa_amounts": {},
            "category_breakdown": [],
            "coa_breakdown": []
        }

    for t in all_copy1_tx:
        w_num = t["week_num"]
        fl = t["flow"]
        amt = t["amount"]
        cat_name = t["category"]
        c_code = t.get("coa_code", "-")
        c_name = t.get("coa_name", "-")

        if w_num in weeks_dict:
            if fl == "INFLOW":
                weeks_dict[w_num]["inflow"] += amt
            else:
                weeks_dict[w_num]["outflow"] += amt
                if cat_name in weeks_dict[w_num]["category_amounts"]:
                    weeks_dict[w_num]["category_amounts"][cat_name] += amt
                coa_lbl = f"{c_code} - {c_name}"
                weeks_dict[w_num]["coa_amounts"][coa_lbl] = weeks_dict[w_num]["coa_amounts"].get(coa_lbl, 0.0) + amt

    running_cum = 0.0
    tot_inflow = 0.0
    tot_outflow = 0.0
    weeks_list = []
    for w in range(1, 11):
        wd = weeks_dict[w]
        wd["net"] = wd["inflow"] - wd["outflow"]
        running_cum += wd["net"]
        wd["cumulative"] = running_cum
        tot_inflow += wd["inflow"]
        tot_outflow += wd["outflow"]
        
        # Build category breakdown
        w_out = wd["outflow"]
        for c in CATEGORY_ORDER:
            if c["flow"] == "OUTFLOW":
                c_amt = wd["category_amounts"].get(c["name"], 0.0)
                if c_amt > 0:
                    wd["category_breakdown"].append({
                        "code": c["code"],
                        "category": c["name"],
                        "name": c["name"],
                        "is_new": c["is_new"],
                        "amount": c_amt,
                        "percentage": round((c_amt / w_out * 100) if w_out > 0 else 0.0, 2)
                    })
        wd["category_breakdown"].sort(key=lambda x: x["amount"], reverse=True)

        for coa_k, coa_v in wd["coa_amounts"].items():
            if coa_v > 0:
                parts = coa_k.split(" - ")
                wd["coa_breakdown"].append({
                    "code": parts[0],
                    "name": coa_k,
                    "category": coa_k,
                    "coa_code": parts[0],
                    "coa_name": parts[1] if len(parts) > 1 else parts[0],
                    "amount": coa_v,
                    "percentage": round((coa_v / w_out * 100) if w_out > 0 else 0.0, 2)
                })
        wd["coa_breakdown"].sort(key=lambda x: x["amount"], reverse=True)

        weeks_list.append(wd)

    # Build Categories Summary
    cat_summary = []
    for c in CATEGORY_ORDER:
        if c["flow"] == "INFLOW":
            cat_summary.append({
                "code": c["code"],
                "name": c["name"],
                "is_new": c["is_new"],
                "amount": tot_inflow,
                "percentage": 100.0
            })
        else:
            c_tot = sum(w["category_amounts"].get(c["name"], 0.0) for w in weeks_list)
            pct = (c_tot / tot_outflow * 100) if tot_outflow > 0 else 0.0
            cat_summary.append({
                "code": c["code"],
                "name": c["name"],
                "is_new": c["is_new"],
                "amount": c_tot,
                "percentage": round(pct, 2)
            })

    # Build COA Summary
    coa_dict = {}
    for w in weeks_list:
        for k, v in w["coa_amounts"].items():
            coa_dict[k] = coa_dict.get(k, 0.0) + v

    coa_summary = []
    for k, v in sorted(coa_dict.items(), key=lambda x: x[1], reverse=True):
        parts = k.split(" - ")
        coa_code = parts[0]
        coa_name = parts[1] if len(parts) > 1 else parts[0]
        coa_summary.append({
            "code": coa_code,
            "name": k,
            "coa_code": coa_code,
            "coa_name": coa_name,
            "is_new": False,
            "amount": v,
            "percentage": round((v / tot_outflow * 100) if tot_outflow > 0 else 0.0, 2)
        })

    # Build Matrix
    matrix = []
    matrix.append({
        "code": "INFLOW-01",
        "category": "[BARU] Penerimaan Kas (Termin Proyek)",
        "is_new": True,
        "flow": "INFLOW",
        "weeks": {f"W{w['week_num']}": w["inflow"] for w in weeks_list},
        "total": tot_inflow
    })
    for c in CATEGORY_ORDER:
        if c["flow"] == "OUTFLOW":
            c_name = c["name"]
            row = {
                "code": c["code"],
                "category": c_name,
                "is_new": c["is_new"],
                "flow": "OUTFLOW",
                "weeks": {f"W{w['week_num']}": w["category_amounts"].get(c_name, 0.0) for w in weeks_list},
                "total": sum(w["category_amounts"].get(c_name, 0.0) for w in weeks_list)
            }
            matrix.append(row)

    # Build COA Matrix
    coa_matrix = []
    inf_coa_row = {
        "code": "41100",
        "category": "41100 - Pendapatan Jasa Pengeboran (Drilling)",
        "is_new": False,
        "flow": "INFLOW",
        "weeks": {f"W{w['week_num']}": w["inflow"] for w in weeks_list},
        "total": tot_inflow
    }
    coa_matrix.append(inf_coa_row)

    for c_info in coa_summary:
        c_key = c_info["name"]
        row = {
            "code": c_info["code"],
            "category": c_key,
            "is_new": False,
            "flow": "OUTFLOW",
            "weeks": {f"W{w['week_num']}": w["coa_amounts"].get(c_key, 0.0) for w in weeks_list},
            "total": sum(w["coa_amounts"].get(c_key, 0.0) for w in weeks_list)
        }
        coa_matrix.append(row)

    return {
        "project": base_cashflow["project"],
        "period": base_cashflow["period"],
        "copy1_available": True,
        "kpi": {
            "total_inflow": tot_inflow,
            "total_outflow": tot_outflow,
            "net_cashflow": tot_inflow - tot_outflow,
            "cumulative_balance": running_cum,
            "weekly_burn_rate": tot_outflow / len(weeks_list) if weeks_list else 0.0
        },
        "categories_summary": cat_summary,
        "coa_summary": coa_summary,
        "weeks": weeks_list,
        "matrix": matrix,
        "coa_matrix": coa_matrix,
        "transactions": all_copy1_tx
    }
