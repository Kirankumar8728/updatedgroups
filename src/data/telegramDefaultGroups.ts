import { Group } from '../types';
import { getCategoryFallbackImage } from '../utils/helpers';

export const TELEGRAM_RAW_SEEDS: Array<{
  url: string;
  handle: string;
}> = [
  { url: 'https://t.me/iPapkorn', handle: 'iPapkorn' },
  { url: 'https://t.me/AAAAAEoGsC-ov5Y0ftVUEQ', handle: 'AAAAAEoGsC-ov5Y0ftVUEQ' },
  { url: 'https://t.me/Tamil_Movies_News_HD', handle: 'Tamil_Movies_News_HD' },
  { url: 'https://t.me/eduteriatestseries', handle: 'eduteriatestseries' },
  { url: 'https://t.me/VqLeIu2bglxkOTc0', handle: 'VqLeIu2bglxkOTc0' },
  { url: 'https://t.me/SelectionWayApp', handle: 'SelectionWayApp' },
  { url: 'https://t.me/somkaptan2026', handle: 'somkaptan2026' },
  { url: 'https://t.me/MAANFILMSTV', handle: 'MAANFILMSTV' },
  { url: 'https://t.me/movies_English_tamil_telugu_hd_m', handle: 'movies_English_tamil_telugu_hd_m' },
  { url: 'https://t.me/qaalidfilms1', handle: 'qaalidfilms1' },
  { url: 'https://t.me/somalisports10', handle: 'somalisports10' },
  { url: 'https://t.me/Bollywood_movies_hindi_hd_news_l', handle: 'Bollywood_movies_hindi_hd_news_l' },
  { url: 'https://t.me/Burmeseseriesofficial1979', handle: 'Burmeseseriesofficial1979' },
  { url: 'https://t.me/mxofficialchannel', handle: 'mxofficialchannel' },
  { url: 'https://t.me/Toss_rk', handle: 'Toss_rk' },
  { url: 'https://t.me/Kyaungni18', handle: 'Kyaungni18' },
  { url: 'https://t.me/XIDIGFILMS134', handle: 'XIDIGFILMS134' },
  { url: 'https://t.me/iconflim', handle: 'iconflim' },
  { url: 'https://t.me/happymovie3channel', handle: 'happymovie3channel' },
  { url: 'https://t.me/Malayalam_Movies_news_mallu_la', handle: 'Malayalam_Movies_news_mallu_la' },
  { url: 'https://t.me/somalia1xbetsomali1xbet', handle: 'somalia1xbetsomali1xbet' },
  { url: 'https://t.me/zaahirfilms12', handle: 'zaahirfilms12' },
  { url: 'https://t.me/IrisMovies2', handle: 'IrisMovies2' },
  { url: 'https://t.me/FANBAROJSTUDIO', handle: 'FANBAROJSTUDIO' },
  { url: 'https://t.me/ASHORGKP6', handle: 'ASHORGKP6' },
  { url: 'https://t.me/RuffgMovies111', handle: 'RuffgMovies111' },
  { url: 'https://t.me/cinema_tharavadu', handle: 'cinema_tharavadu' },
  { url: 'https://t.me/FANPROJ_HINDI_2025', handle: 'FANPROJ_HINDI_2025' },
  { url: 'https://t.me/CAAWIYEFILMSHDD', handle: 'CAAWIYEFILMSHDD' },
  { url: 'https://t.me/Somalisports10001', handle: 'Somalisports10001' },
  { url: 'https://t.me/CAAWIYEMUSALSALTVHD1', handle: 'CAAWIYEMUSALSALTVHD1' },
  { url: 'https://t.me/filmcorner_fc', handle: 'filmcorner_fc' },
  { url: 'https://t.me/progang7', handle: 'progang7' },
  { url: 'https://t.me/RAAMFILMS24', handle: 'RAAMFILMS24' },
  { url: 'https://t.me/MX_Networks', handle: 'MX_Networks' },
  { url: 'https://t.me/Daha1777', handle: 'Daha1777' },
  { url: 'https://t.me/CADGOOSI11', handle: 'CADGOOSI11' },
  { url: 'https://t.me/Power_Book_II_III_IV', handle: 'Power_Book_II_III_IV' },
  { url: 'https://t.me/offerhub_official', handle: 'offerhub_official' },
  { url: 'https://t.me/Movies_Hd_tamil_latest', handle: 'Movies_Hd_tamil_latest' },
  { url: 'https://t.me/GOOTAMFILIMS', handle: 'GOOTAMFILIMS' },
  { url: 'https://t.me/GNMS_Editz_1', handle: 'GNMS_Editz_1' },
  { url: 'https://t.me/Netflix_Seriesbot4', handle: 'Netflix_Seriesbot4' },
  { url: 'https://t.me/Bidhaan_tv3', handle: 'Bidhaan_tv3' },
  { url: 'https://t.me/MADOOBEFILMS', handle: 'MADOOBEFILMS' },
  { url: 'https://t.me/Malayalam_new_movies_2026', handle: 'Malayalam_new_movies_2026' },
  { url: 'https://t.me/tOSwnHd-j_FhMjRk', handle: 'tOSwnHd-j_FhMjRk' },
  { url: 'https://t.me/kaptantiger', handle: 'kaptantiger' },
  { url: 'https://t.me/FPflims', handle: 'FPflims' },
  { url: 'https://t.me/RHBdNjhzlY0NGY1', handle: 'RHBdNjhzlY0NGY1' },
  { url: 'https://t.me/Tayofilms', handle: 'Tayofilms' },
  { url: 'https://t.me/SAHALFILMS2', handle: 'SAHALFILMS2' },
  { url: 'https://t.me/maahir_films0', handle: 'maahir_films0' },
  { url: 'https://t.me/Movies_hub_main', handle: 'Movies_hub_main' },
  { url: 'https://t.me/GOOTAM_FILMS2', handle: 'GOOTAM_FILMS2' },
  { url: 'https://t.me/MAAN_FILMS1', handle: 'MAAN_FILMS1' },
  { url: 'https://t.me/vega_officials', handle: 'vega_officials' },
  { url: 'https://t.me/MOHASTUDIO', handle: 'MOHASTUDIO' },
  { url: 'https://t.me/benlowfilms', handle: 'benlowfilms' },
  { url: 'https://t.me/BIDHAAN_MOVIES', handle: 'BIDHAAN_MOVIES' },
  { url: 'https://t.me/DILAA_FILMS1', handle: 'DILAA_FILMS1' },
  { url: 'https://t.me/Astaan_flims', handle: 'Astaan_flims' },
  { url: 'https://t.me/jecelowfilms', handle: 'jecelowfilms' },
  { url: 'https://t.me/abdallefilms1', handle: 'abdallefilms1' },
  { url: 'https://t.me/u1k90F7l9-84ZTJk', handle: 'u1k90F7l9-84ZTJk' },
  { url: 'https://t.me/iPopkarn', handle: 'iPopkarn' },
  { url: 'https://t.me/Tamil_Love_Songs_Hd_Status', handle: 'Tamil_Love_Songs_Hd_Status' },
  { url: 'https://t.me/msone', handle: 'msone' },
  { url: 'https://t.me/tamil_movies_dubbed_news_latest', handle: 'tamil_movies_dubbed_news_latest' },
  { url: 'https://t.me/Crypto_Best_Airdrops_And_Update', handle: 'Crypto_Best_Airdrops_And_Update' },
  { url: 'https://t.me/khanthtookyaw60', handle: 'khanthtookyaw60' },
  { url: 'https://t.me/Anime_Gallery_Seasonal', handle: 'Anime_Gallery_Seasonal' },
  { url: 'https://t.me/khkbollywoodchannel1', handle: 'khkbollywoodchannel1' },
  { url: 'https://t.me/onichanfansubmyanmar', handle: 'onichanfansubmyanmar' },
  { url: 'https://t.me/klsjkkkkwjojed', handle: 'klsjkkkkwjojed' },
  { url: 'https://t.me/betwave001', handle: 'betwave001' },
  { url: 'https://t.me/ALFAGHISTUDIO', handle: 'ALFAGHISTUDIO' },
  { url: 'https://t.me/kurulus_orhan_af_somali', handle: 'kurulus_orhan_af_somali' },
  { url: 'https://t.me/Crypto_66Lottery_Lotteryy', handle: 'Crypto_66Lottery_Lotteryy' },
  { url: 'https://t.me/MomoBgm7', handle: 'MomoBgm7' },
  { url: 'https://t.me/Cash_Online_Earning_Jobs', handle: 'Cash_Online_Earning_Jobs' },
  { url: 'https://t.me/KCWTSF', handle: 'KCWTSF' },
  { url: 'https://t.me/NasiyeSports', handle: 'NasiyeSports' },
  { url: 'https://t.me/blskymainchannel', handle: 'blskymainchannel' },
  { url: 'https://t.me/12gUB7amToBmZmU1', handle: '12gUB7amToBmZmU1' },
  { url: 'https://t.me/cbpublic4', handle: 'cbpublic4' },
  { url: 'https://t.me/Sauthmovieinhindi', handle: 'Sauthmovieinhindi' },
  { url: 'https://t.me/Malayalam_Movies_new_2025', handle: 'Malayalam_Movies_new_2025' },
  { url: 'https://t.me/mallu_new_movies_hd_malayalam_la', handle: 'mallu_new_movies_hd_malayalam_la' },
  { url: 'https://t.me/mRkxf0rsfsg4NTM0', handle: 'mRkxf0rsfsg4NTM0' },
  { url: 'https://t.me/FANPROJ_TV1', handle: 'FANPROJ_TV1' },
  { url: 'https://t.me/KurulusOrhanafsomali2', handle: 'KurulusOrhanafsomali2' },
  { url: 'https://t.me/naseexo114', handle: 'naseexo114' },
  { url: 'https://t.me/online_shopping_Deal_Offers_1k', handle: 'online_shopping_Deal_Offers_1k' },
  { url: 'https://t.me/SMCKTSF', handle: 'SMCKTSF' },
  { url: 'https://t.me/k7creationsofficial', handle: 'k7creationsofficial' },
  { url: 'https://t.me/Dramaif', handle: 'Dramaif' },
  { url: 'https://t.me/HX5wyN1HGd43NDM9', handle: 'HX5wyN1HGd43NDM9' },
  { url: 'https://t.me/Anime_Ongoing_Aho_Sub_Indo', handle: 'Anime_Ongoing_Aho_Sub_Indo' },
  { url: 'https://t.me/GNMS_Editz_Videos', handle: 'GNMS_Editz_Videos' },
  { url: 'https://t.me/shimamuinvest', handle: 'shimamuinvest' },
  { url: 'https://t.me/TIF_Network', handle: 'TIF_Network' },
  { url: 'https://t.me/job4fresherss', handle: 'job4fresherss' },
  { url: 'https://t.me/jobsgovind', handle: 'jobsgovind' },
  { url: 'https://t.me/freshershunt', handle: 'freshershunt' },
  { url: 'https://t.me/FreeJobAlertOfficially', handle: 'FreeJobAlertOfficially' },
  { url: 'https://t.me/SSC_CGL_MTS_CHSL_GD_GK_Math_SI', handle: 'SSC_CGL_MTS_CHSL_GD_GK_Math_SI' },
  { url: 'https://t.me/tofficersacademy', handle: 'tofficersacademy' },
  { url: 'https://t.me/PLACEMENTLELO', handle: 'PLACEMENTLELO' },
  { url: 'https://t.me/alljobsintelugu', handle: 'alljobsintelugu' },
  { url: 'https://t.me/Railway_Jobs_NTPC_JE_ALP_Group_D', handle: 'Railway_Jobs_NTPC_JE_ALP_Group_D' },
  { url: 'https://t.me/oflatestblog', handle: 'oflatestblog' },
  { url: 'https://t.me/work4freshers', handle: 'work4freshers' },
  { url: 'https://t.me/mohancareers', handle: 'mohancareers' },
  { url: 'https://t.me/telugujobupdates03', handle: 'telugujobupdates03' },
  { url: 'https://t.me/seekerascommerce', handle: 'seekerascommerce' },
  { url: 'https://t.me/foundthejob', handle: 'foundthejob' },
  { url: 'https://t.me/daily_jobupdates', handle: 'daily_jobupdates' },
  { url: 'https://t.me/getjobss', handle: 'getjobss' },
  { url: 'https://t.me/jobsstation_official', handle: 'jobsstation_official' },
  { url: 'https://t.me/anilsiriti', handle: 'anilsiriti' },
  { url: 'https://t.me/fresheroffcampus', handle: 'fresheroffcampus' },
  { url: 'https://t.me/kickcharm', handle: 'kickcharm' },
  { url: 'https://t.me/tcs_nqt_resources', handle: 'tcs_nqt_resources' },
  { url: 'https://t.me/jobs_SQL', handle: 'jobs_SQL' },
  { url: 'https://t.me/karnatakacareers', handle: 'karnatakacareers' },
  { url: 'https://t.me/seekeraswfh', handle: 'seekeraswfh' },
  { url: 'https://t.me/freshersnowofficial', handle: 'freshersnowofficial' },
  { url: 'https://t.me/latestfreejobsintelugu', handle: 'latestfreejobsintelugu' },
  { url: 'https://t.me/Walkininterview_seekeras', handle: 'Walkininterview_seekeras' },
  { url: 'https://t.me/gocareers', handle: 'gocareers' },
  { url: 'https://t.me/merademy', handle: 'merademy' },
  { url: 'https://t.me/tcs_infosys_cognizant_jobs', handle: 'tcs_infosys_cognizant_jobs' },
  { url: 'https://t.me/jobsvacancynew', handle: 'jobsvacancynew' },
  { url: 'https://t.me/off_campus_jobs_and_internships', handle: 'off_campus_jobs_and_internships' },
  { url: 'https://t.me/seekerasjobs', handle: 'seekerasjobs' },
  { url: 'https://t.me/jobsregion', handle: 'jobsregion' },
  { url: 'https://t.me/OfficialAasma', handle: 'OfficialAasma' },
  { url: 'https://t.me/engineerjobsindia', handle: 'engineerjobsindia' },
  { url: 'https://t.me/internfreak', handle: 'internfreak' },
  { url: 'https://t.me/sarkarijobfind_com', handle: 'sarkarijobfind_com' },
  { url: 'https://t.me/OPENVACANCIES2022', handle: 'OPENVACANCIES2022' },
  { url: 'https://t.me/jobskull', handle: 'jobskull' },
  { url: 'https://t.me/jobupdates4', handle: 'jobupdates4' },
  { url: 'https://t.me/mncmegahiring', handle: 'mncmegahiring' },
  { url: 'https://t.me/prathamchaudharyjobs', handle: 'prathamchaudharyjobs' },
  { url: 'https://t.me/TechProgramMind_official', handle: 'TechProgramMind_official' },
  { url: 'https://t.me/agrijobs2', handle: 'agrijobs2' },
  { url: 'https://t.me/placementdrive_pld', handle: 'placementdrive_pld' },
  { url: 'https://t.me/CivilJobsJunction', handle: 'CivilJobsJunction' },
  { url: 'https://t.me/tcs_nqt_guide', handle: 'tcs_nqt_guide' },
  { url: 'https://t.me/FreshersGold', handle: 'FreshersGold' },
  { url: 'https://t.me/freshersjobs24', handle: 'freshersjobs24' },
  { url: 'https://t.me/harikajobalertyoutube', handle: 'harikajobalertyoutube' },
  { url: 'https://t.me/studymedia9', handle: 'studymedia9' },
  { url: 'https://t.me/ultrajobupdates', handle: 'ultrajobupdates' },
  { url: 'https://t.me/CareersforEngineers', handle: 'CareersforEngineers' },
  { url: 'https://t.me/Govt_Jobs_News_Police_Bharti', handle: 'Govt_Jobs_News_Police_Bharti' },
  { url: 'https://t.me/tamil_jobupdates', handle: 'tamil_jobupdates' },
  { url: 'https://t.me/jobmaama', handle: 'jobmaama' },
  { url: 'https://t.me/powerfulwebsitex', handle: 'powerfulwebsitex' },
  { url: 'https://t.me/diplomatocareer', handle: 'diplomatocareer' },
  { url: 'https://t.me/Government_Jobs_Freshers_Live', handle: 'Government_Jobs_Freshers_Live' },
  { url: 'https://t.me/coding_solution_help', handle: 'coding_solution_help' },
  { url: 'https://t.me/POSITIVEPAYTMEARNING', handle: 'POSITIVEPAYTMEARNING' },
  { url: 'https://t.me/upsc_ssc_rrb_current_affairs_gk', handle: 'upsc_ssc_rrb_current_affairs_gk' },
  { url: 'https://t.me/enrology', handle: 'enrology' },
  { url: 'https://t.me/AIjobz', handle: 'AIjobz' },
  { url: 'https://t.me/udemytm', handle: 'udemytm' },
  { url: 'https://t.me/zoho_accenture_capgemini_jobs', handle: 'zoho_accenture_capgemini_jobs' },
  { url: 'https://t.me/kiraneducation_123', handle: 'kiraneducation_123' },
  { url: 'https://t.me/off_campus_careers', handle: 'off_campus_careers' },
  { url: 'https://t.me/dubaijobs2023', handle: 'dubaijobs2023' },
  { url: 'https://t.me/Freejobsssss', handle: 'Freejobsssss' },
  { url: 'https://t.me/Offcampus_Campusdrive_Jobs_Drive', handle: 'Offcampus_Campusdrive_Jobs_Drive' },
  { url: 'https://t.me/Walk_in_Interview', handle: 'Walk_in_Interview' },
  { url: 'https://t.me/DalalStreetSaga', handle: 'DalalStreetSaga' },
  { url: 'https://t.me/sarkarirojgarsr', handle: 'sarkarirojgarsr' },
  { url: 'https://t.me/harmeenews', handle: 'harmeenews' },
  { url: 'https://t.me/software_testing_job', handle: 'software_testing_job' },
  { url: 'https://t.me/Job_Security_Council_nonPMET', handle: 'Job_Security_Council_nonPMET' },
  { url: 'https://t.me/job4offcampus', handle: 'job4offcampus' },
  { url: 'https://t.me/kbprasacbank_career', handle: 'kbprasacbank_career' },
  { url: 'https://t.me/ctetmocktest', handle: 'ctetmocktest' },
  { url: 'https://t.me/httpsbd_jobs', handle: 'httpsbd_jobs' },
  { url: 'https://t.me/infytqanswers', handle: 'infytqanswers' },
  { url: 'https://t.me/jobsfodia', handle: 'jobsfodia' },
  { url: 'https://t.me/cmc_indore_ssc', handle: 'cmc_indore_ssc' },
  { url: 'https://t.me/jrpindia01', handle: 'jrpindia01' },
  { url: 'https://t.me/CACommerceGovtJobs', handle: 'CACommerceGovtJobs' },
  { url: 'https://t.me/mncdrive', handle: 'mncdrive' },
  { url: 'https://t.me/Dhruvicodes', handle: 'Dhruvicodes' },
  { url: 'https://t.me/swaasajobs', handle: 'swaasajobs' },
  { url: 'https://t.me/NamibianJobOpportunities', handle: 'NamibianJobOpportunities' },
  { url: 'https://t.me/jobsingoa', handle: 'jobsingoa' },
  { url: 'https://t.me/bca_bsc_bcom_ba_mba_mca_mcom_job', handle: 'bca_bsc_bcom_ba_mba_mca_mcom_job' },
  { url: 'https://t.me/jobsinhyderabadjhi', handle: 'jobsinhyderabadjhi' },
  { url: 'https://t.me/SSCWALLAH_JOBS', handle: 'SSCWALLAH_JOBS' },
  { url: 'https://t.me/gracewithme1809', handle: 'gracewithme1809' },
  { url: 'https://t.me/jobkola', handle: 'jobkola' },
  { url: 'https://t.me/jobcaam', handle: 'jobcaam' },
  { url: 'https://t.me/IndiaJobRadar2026', handle: 'IndiaJobRadar2026' },
  { url: 'https://t.me/Careeralertinfos', handle: 'Careeralertinfos' },
  { url: 'https://t.me/amazonjobs', handle: 'amazonjobs' },
  { url: 'https://t.me/jiiuae', handle: 'jiiuae' },
  { url: 'https://t.me/offcampusjobs_freshers', handle: 'offcampusjobs_freshers' },
  { url: 'https://t.me/Nxthiring', handle: 'Nxthiring' },
  { url: 'https://t.me/fresher_job_updates_by_akhila', handle: 'fresher_job_updates_by_akhila' },
  { url: 'https://t.me/sanskarinewz', handle: 'sanskarinewz' },
  { url: 'https://t.me/JDpay668', handle: 'JDpay668' },
  { url: 'https://t.me/LearnwithAnu', handle: 'LearnwithAnu' },
  { url: 'https://t.me/Govt_Jobs_PREPP', handle: 'Govt_Jobs_PREPP' },
  { url: 'https://t.me/thestandardarenakenya', handle: 'thestandardarenakenya' },
  { url: 'https://t.me/allgoodjobs', handle: 'allgoodjobs' },
  { url: 'https://t.me/jobalert_alljobs', handle: 'jobalert_alljobs' },
  { url: 'https://t.me/Freejobinformations', handle: 'Freejobinformations' },
  { url: 'https://t.me/GOAGAMESTEACHERLARA', handle: 'GOAGAMESTEACHERLARA' },
  { url: 'https://t.me/Programmer_Jokes_Memes', handle: 'Programmer_Jokes_Memes' },
  { url: 'https://t.me/JobsAndOffCampusDrive', handle: 'JobsAndOffCampusDrive' },
  { url: 'https://t.me/jobs_2022batch', handle: 'jobs_2022batch' },
  { url: 'https://t.me/FreeDubaiJobsHub', handle: 'FreeDubaiJobsHub' },
  { url: 'https://t.me/Hot_jobs_logistics', handle: 'Hot_jobs_logistics' },
  { url: 'https://t.me/HelloOLBN', handle: 'HelloOLBN' },
  { url: 'https://t.me/HireGlocal', handle: 'HireGlocal' },
  { url: 'https://t.me/neelaxmi_Official', handle: 'neelaxmi_Official' },
  { url: 'https://t.me/parttimejobs_chennai', handle: 'parttimejobs_chennai' },
  { url: 'https://t.me/LatestJobsPoint_Official', handle: 'LatestJobsPoint_Official' },
  { url: 'https://t.me/Selection_IAS', handle: 'Selection_IAS' },
  { url: 'https://t.me/NayeRahiCommunity', handle: 'NayeRahiCommunity' },
  { url: 'https://t.me/batterylife01', handle: 'batterylife01' },
  { url: 'https://t.me/Freelancejobupdates', handle: 'Freelancejobupdates' },
  { url: 'https://t.me/software_internships_quick_alert', handle: 'software_internships_quick_alert' },
  { url: 'https://t.me/Civilfriends23', handle: 'Civilfriends23' },
  { url: 'https://t.me/md6420s', handle: 'md6420s' },
  { url: 'https://t.me/indiajobalertHYT', handle: 'indiajobalertHYT' },
  { url: 'https://t.me/freejobswork', handle: 'freejobswork' },
  { url: 'https://t.me/elarisjobs', handle: 'elarisjobs' },
  { url: 'https://t.me/Govt_Jobs_PvtRWAllJobsCR', handle: 'Govt_Jobs_PvtRWAllJobsCR' },
  { url: 'https://t.me/SarkariChakiri', handle: 'SarkariChakiri' },
  { url: 'https://t.me/life_improve_content', handle: 'life_improve_content' },
  { url: 'https://t.me/amitkilhor', handle: 'amitkilhor' },
  { url: 'https://t.me/mehak_jainAIR17', handle: 'mehak_jainAIR17' },
  { url: 'https://t.me/Heyavinash2022', handle: 'Heyavinash2022' },
  { url: 'https://t.me/bd_chaurasia', handle: 'bd_chaurasia' },
  { url: 'https://t.me/UonoMasterChannel', handle: 'UonoMasterChannel' },
  { url: 'https://t.me/ytechb', handle: 'ytechb' },
  { url: 'https://t.me/vishaltechchannel', handle: 'vishaltechchannel' },
  { url: 'https://t.me/JayantNahataIAS', handle: 'JayantNahataIAS' },
  { url: 'https://t.me/Aiimspioneer', handle: 'Aiimspioneer' },
  { url: 'https://t.me/mrtruetales', handle: 'mrtruetales' },
  { url: 'https://t.me/TOSS_MATCH_EXPERT_PREDICTION', handle: 'TOSS_MATCH_EXPERT_PREDICTION' },
  { url: 'https://t.me/AnilTech9', handle: 'AnilTech9' },
  { url: 'https://t.me/yethar63', handle: 'yethar63' },
  { url: 'https://t.me/CommodityFocusByKotakSecurities', handle: 'CommodityFocusByKotakSecurities' },
  { url: 'https://t.me/ABUPKDEDITZ', handle: 'ABUPKDEDITZ' },
  { url: 'https://t.me/abcdehemantaeditingpurulia', handle: 'abcdehemantaeditingpurulia' },
  { url: 'https://t.me/rahulbusyguyy', handle: 'rahulbusyguyy' },
  { url: 'https://t.me/DreamCalls100x', handle: 'DreamCalls100x' },
  { url: 'https://t.me/officialharsh_g', handle: 'officialharsh_g' },
  { url: 'https://t.me/agamtechtricks', handle: 'agamtechtricks' },
  { url: 'https://t.me/jeeudaan_namochat', handle: 'jeeudaan_namochat' },
  { url: 'https://t.me/bigwinner88999', handle: 'bigwinner88999' },
  { url: 'https://t.me/IIT_JEE_MATERIALS_2027', handle: 'IIT_JEE_MATERIALS_2027' },
  { url: 'https://t.me/NitishsinghPatel', handle: 'NitishsinghPatel' },
  { url: 'https://t.me/cryptoo_Alice', handle: 'cryptoo_Alice' },
  { url: 'https://t.me/LootDealsBy5MinuteTech', handle: 'LootDealsBy5MinuteTech' },
  { url: 'https://t.me/sikardeals', handle: 'sikardeals' },
  { url: 'https://t.me/HazelnuttMoore', handle: 'HazelnuttMoore' },
  { url: 'https://t.me/sagarpatelsinger', handle: 'sagarpatelsinger' },
  { url: 'https://t.me/ultranull', handle: 'ultranull' },
  { url: 'https://t.me/chaapopaisacrore', handle: 'chaapopaisacrore' },
  { url: 'https://t.me/MEMandSWAG', handle: 'MEMandSWAG' },
  { url: 'https://t.me/intuitionzone', handle: 'intuitionzone' },
  { url: 'https://t.me/deeptonediaries', handle: 'deeptonediaries' },
  { url: 'https://t.me/kudakudasuda', handle: 'kudakudasuda' },
  { url: 'https://t.me/ponospopi', handle: 'ponospopi' },
  { url: 'https://t.me/oraclespotfuturesignals', handle: 'oraclespotfuturesignals' },
  { url: 'https://t.me/topdealslootoffer', handle: 'topdealslootoffer' },
  { url: 'https://t.me/jordiie009', handle: 'jordiie009' },
  { url: 'https://t.me/newspaperpdf_pdfnewspaper', handle: 'newspaperpdf_pdfnewspaper' },
  { url: 'https://t.me/tekraze', handle: 'tekraze' },
  { url: 'https://t.me/amarapatelofficial', handle: 'amarapatelofficial' },
  { url: 'https://t.me/tecnotecktrick', handle: 'tecnotecktrick' },
  { url: 'https://t.me/DESAWERGURUFIXER', handle: 'DESAWERGURUFIXER' },
  { url: 'https://t.me/cyclopsis', handle: 'cyclopsis' },
  { url: 'https://t.me/austinftwissacmmer', handle: 'austinftwissacmmer' },
  { url: 'https://t.me/vikrant1200', handle: 'vikrant1200' },
  { url: 'https://t.me/Bi_Amde', handle: 'Bi_Amde' },
  { url: 'https://t.me/Hanumanji_Status_Whatsapp_videos', handle: 'Hanumanji_Status_Whatsapp_videos' },
  { url: 'https://t.me/Saleghar_Offers', handle: 'Saleghar_Offers' },
  { url: 'https://t.me/PriceCredDeals', handle: 'PriceCredDeals' },
  { url: 'https://t.me/attitude_shayari_Quotes_Status', handle: 'attitude_shayari_Quotes_Status' },
  { url: 'https://t.me/MontajMT', handle: 'MontajMT' },
  { url: 'https://t.me/Bappa_lover07', handle: 'Bappa_lover07' },
  { url: 'https://t.me/GideonsMp3s', handle: 'GideonsMp3s' },
  { url: 'https://t.me/shahir_edits', handle: 'shahir_edits' },
  { url: 'https://t.me/trendy_creations', handle: 'trendy_creations' },
  { url: 'https://t.me/trending_beats', handle: 'trending_beats' },
  { url: 'https://t.me/some_quote', handle: 'some_quote' },
  { url: 'https://t.me/vicky_dadaa_rial', handle: 'vicky_dadaa_rial' },
  { url: 'https://t.me/Radhe_Krishna_God', handle: 'Radhe_Krishna_God' },
  { url: 'https://t.me/Brighten_Up_Your_Mind', handle: 'Brighten_Up_Your_Mind' },
  { url: 'https://t.me/InsideDeepQuote', handle: 'InsideDeepQuote' },
  { url: 'https://t.me/Dawoodibrahimmatchreports', handle: 'Dawoodibrahimmatchreports' },
  { url: 'https://t.me/Love_Status7', handle: 'Love_Status7' },
  { url: 'https://t.me/Agent_Kim_Reactivated_k', handle: 'Agent_Kim_Reactivated_k' },
  { url: 'https://t.me/Relationship_love_quotes_A', handle: 'Relationship_love_quotes_A' },
  { url: 'https://t.me/oceanwaveseve', handle: 'oceanwaveseve' },
  { url: 'https://t.me/Vampire_Girl_01', handle: 'Vampire_Girl_01' },
  { url: 'https://t.me/positivevibes_s', handle: 'positivevibes_s' },
  { url: 'https://t.me/DeeplyinloveTM', handle: 'DeeplyinloveTM' },
  { url: 'https://t.me/status4ever', handle: 'status4ever' },
  { url: 'https://t.me/positiveflux', handle: 'positiveflux' },
  { url: 'https://t.me/pozitive_thought', handle: 'pozitive_thought' },
  { url: 'https://t.me/GKYstory', handle: 'GKYstory' },
  { url: 'https://t.me/Tradingbrainers', handle: 'Tradingbrainers' },
  { url: 'https://t.me/Usebixy', handle: 'Usebixy' },
  { url: 'https://t.me/couples_resort', handle: 'couples_resort' },
  { url: 'https://t.me/lovelyquotes2', handle: 'lovelyquotes2' },
  { url: 'https://t.me/gharkaowner', handle: 'gharkaowner' },
  { url: 'https://t.me/Triptigerworld', handle: 'Triptigerworld' },
  { url: 'https://t.me/EuphoriaMisri', handle: 'EuphoriaMisri' },
  { url: 'https://t.me/Daily_MindFuel', handle: 'Daily_MindFuel' },
  { url: 'https://t.me/hakuna_matata_02', handle: 'hakuna_matata_02' },
  { url: 'https://t.me/MarcoDiaries', handle: 'MarcoDiaries' },
  { url: 'https://t.me/Luvv_lizz', handle: 'Luvv_lizz' },
  { url: 'https://t.me/theselfmusings', handle: 'theselfmusings' },
  { url: 'https://t.me/Daily_Dose_of_Motivation', handle: 'Daily_Dose_of_Motivation' },
  { url: 'https://t.me/PyAl3X', handle: 'PyAl3X' },
  { url: 'https://t.me/Anandu_here', handle: 'Anandu_here' },
  { url: 'https://t.me/JeevanVijayQuotes', handle: 'JeevanVijayQuotes' },
  { url: 'https://t.me/RiseWithReads', handle: 'RiseWithReads' },
  { url: 'https://t.me/rkeditzooficial', handle: 'rkeditzooficial' },
  { url: 'https://t.me/ruyashdoffl', handle: 'ruyashdoffl' },
  { url: 'https://t.me/tamil_old_songs', handle: 'tamil_old_songs' },
  { url: 'https://t.me/Kpopvideos_link', handle: 'Kpopvideos_link' }
];

// Helper to convert handle into clean human title & SEO parameters
export function parseHandleToGroup(item: { url: string; handle: string }, index: number): Group {
  const { url, handle } = item;
  const rawClean = handle.replace(/[_.-]+/g, ' ').replace(/\s+/g, ' ').trim();
  const lower = handle.toLowerCase();

  // Category determination
  let category: Group['category'] = 'Entertainment & Movies';
  let language: Group['language'] = 'English';
  let region: Group['region'] = 'Global';
  let tags: string[] = ['#telegram', '#community', '#updates'];
  let title = rawClean;
  let description = `Official Telegram community channel for ${rawClean}. Join to get daily updates, active discussions, media, and resources.`;
  let rankKeywords: string[] = [`${lower} telegram`, `${rawClean} telegram link`, `join ${lower} channel`];

  // Specific high-fidelity channels with verified real data
  if (lower === 'anilsiriti') {
    return {
      id: `tg-group-${index + 1}-anilsiriti`,
      title: 'Anil sir ITI YouTube Channel(www.anilsiriti.in)',
      description: 'Anil Sir ITI द्वारा आपको निम्नलिखित platform provide किया जाता है:\t1. Anil Sir ITI YouTube Channel: यहां video के माध्यम से ITI छात्रों को Jobs, Apprentice, Exam की जानकारी दी जाती है\t2. www.anilsiriti.in : Anil Sir ITI Website पर ITI की jobs, apprentice',
      url: 'https://t.me/anilsiriti',
      platform: 'telegram',
      category: 'Education & Study',
      language: 'Hindi',
      region: 'Asia Pacific',
      customTags: ['#telegram', '#community', '#anilsiriti', '#iti', '#jobs', '#education'],
      imageUrl: 'https://cdn5.telesco.pe/file/ZJY8AwoZMRN7IE3xyRp9aqB0dlohYzS2KV5SPGTXsOLIyenP4pcjqZ1giQOg3WhSx1D6nQXMP-0CroAsOoJtzpdGkIYOVZdXR9sfzihBIgpOdMp4quTBbqlJF2N9Bu5X8TTVrFEWGnv1nM0PKpN6Xs1OpEjH8ISEpUTuCrUOx74ulTwfOl8dZv8PlKdycnvp1If6g69I68p_DfbTwZJ7nIWrM_jOFpqHAtg4xrsvtjXzyJMigudLq2eid0tSFsIY9wbLNwXCpkNL8ZG4sdEXSV-OhiCvip3-e4GRegbtRbLfDW5NpCTUabjP5PHWkNRjuJWLqvHbwX1GNGCo4olqnA.jpg',
      bannerUrl: 'https://cdn5.telesco.pe/file/ZJY8AwoZMRN7IE3xyRp9aqB0dlohYzS2KV5SPGTXsOLIyenP4pcjqZ1giQOg3WhSx1D6nQXMP-0CroAsOoJtzpdGkIYOVZdXR9sfzihBIgpOdMp4quTBbqlJF2N9Bu5X8TTVrFEWGnv1nM0PKpN6Xs1OpEjH8ISEpUTuCrUOx74ulTwfOl8dZv8PlKdycnvp1If6g69I68p_DfbTwZJ7nIWrM_jOFpqHAtg4xrsvtjXzyJMigudLq2eid0tSFsIY9wbLNwXCpkNL8ZG4sdEXSV-OhiCvip3-e4GRegbtRbLfDW5NpCTUabjP5PHWkNRjuJWLqvHbwX1GNGCo4olqnA.jpg',
      memberCount: 109058,
      growthRate: 26.9,
      clicks: 0,
      upvotes: 0,
      shares: 0,
      bookmarks: 0,
      rating: 0,
      ratingCount: 0,
      comments: [],
      verified: true,
      featured: false,
      isNsfw: false,
      safetyScore: 96,
      rankScore: 94,
      rankGrade: 'A',
      rankKeywords: ['anilsiriti telegram', 'anilsiriti telegram link', 'join anilsiriti channel', 'iti jobs telegram'],
      slug: 'tg-anilsiriti',
      metaDescription: 'Anil Sir ITI द्वारा आपको निम्नलिखित platform provide किया जाता है:\t1. Anil Sir ITI YouTube Channel: यहां video के माध्यम से ITI छात्रों को Jobs, Apprentice...',
      createdAt: new Date().toISOString(),
      lastActive: '13 mins ago',
      rulesSummary: 'No spamming, stay respectful, follow Telegram Community Guidelines.',
      authorName: 'Community Member',
      publishedAt: new Date().toISOString(),
      isActive: true,
      is_active: true,
      metadataSource: 'telegram',
      fallbackMetadata: false,
      lastMetadataFetchAt: new Date().toISOString(),
      normalizedUrl: 'https://t.me/anilsiriti',
      platformHandle: 'anilsiriti',
    };
  }

  // Specific semantic matching for SEO
  if (
    lower.includes('job') || 
    lower.includes('fresher') || 
    lower.includes('placement') || 
    lower.includes('hiring') || 
    lower.includes('career') || 
    lower.includes('interview') || 
    lower.includes('intern') ||
    lower.includes('vacanc') ||
    lower.includes('work') ||
    lower.includes('freelance') ||
    lower.includes('wfh')
  ) {
    category = 'Business & Startups';
    tags = ['#jobs', '#freshers', '#career', '#offcampus', '#hiring', '#placement'];
    region = 'Asia Pacific';
    
    if (lower.includes('telugu')) {
      language = 'Telugu';
      title = `${rawClean.replace(/telugu/i, '').trim()} Telugu Jobs & Career Hub`;
    } else if (lower.includes('tamil')) {
      language = 'Tamil';
      title = `${rawClean.replace(/tamil/i, '').trim()} Tamil Job Updates`;
    } else if (lower.includes('dubai') || lower.includes('uae')) {
      region = 'Global';
      title = `${rawClean} Dubai & UAE Job Openings`;
    } else if (lower.includes('karnataka')) {
      language = 'Kannada';
      title = `${rawClean} Karnataka Job Alerts`;
    } else if (lower.includes('ssc') || lower.includes('railway') || lower.includes('govt') || lower.includes('sarkari') || lower.includes('police')) {
      category = 'Education & Study';
      language = 'Hindi';
      title = `${rawClean} Govt & Sarkari Naukri Alerts`;
      tags = ['#sarkarijob', '#govtjobs', '#ssc', '#railway', '#police'];
    } else {
      title = `${rawClean} | Off Campus Jobs & Freshers Drive`;
    }

    description = `Verified Telegram channel providing latest verified job vacancies, fresher hiring alerts, MNC off-campus drives (TCS, Infosys, Wipro, Accenture), internships, and career opportunities updated daily.`;
    rankKeywords = [
      `${lower} telegram link`,
      'freshers jobs telegram channel',
      'off campus hiring telegram group',
      'latest govt jobs alert telegram',
      'mnc drive updates telegram'
    ];
  } else if (
    lower.includes('ssc') || 
    lower.includes('upsc') || 
    lower.includes('ias') || 
    lower.includes('ctet') || 
    lower.includes('iit') || 
    lower.includes('jee') || 
    lower.includes('study') || 
    lower.includes('education') || 
    lower.includes('affairs') || 
    lower.includes('exam') ||
    lower.includes('eduteria') ||
    lower.includes('rrb')
  ) {
    category = 'Education & Study';
    language = 'Hindi';
    region = 'Asia Pacific';
    tags = ['#upsc', '#ssc', '#studymaterials', '#currentaffairs', '#examsprep', '#gk'];
    title = `${rawClean} - Competitive Exam Prep & Study Notes`;
    description = `Comprehensive study resources, daily GK current affairs quizzes, PDF notes, mock tests, and strategy sessions for UPSC, SSC CGL/CHSL/MTS, Railway NTPC, and state PSC aspirants.`;
    rankKeywords = [
      `${lower} telegram channel`,
      'upsc ssc study material telegram',
      'daily current affairs telegram pdf',
      'competitive exam mock test telegram'
    ];
  } else if (
    lower.includes('movie') || 
    lower.includes('film') || 
    lower.includes('cinema') || 
    lower.includes('series') || 
    lower.includes('netflix') || 
    lower.includes('popcorn') ||
    lower.includes('papkorn') ||
    lower.includes('popkarn') ||
    lower.includes('musalsal') ||
    lower.includes('flim')
  ) {
    category = 'Entertainment & Movies';
    tags = ['#movies', '#hdmovies', '#cinema', '#webseries', '#reviews', '#ott'];
    
    if (lower.includes('tamil')) {
      language = 'Tamil';
      title = `${rawClean} HD Tamil Movies & News`;
      tags = ['#tamilmovies', '#kollywood', '#tamilcinema', '#hdmovies'];
    } else if (lower.includes('mallu') || lower.includes('malayalam') || lower.includes('msone') || lower.includes('tharavadu')) {
      language = 'Malayalam';
      title = `${rawClean} Malayalam Movies & Subtitles Hub`;
      tags = ['#malayalammovies', '#mollywood', '#msone', '#mallucinema'];
    } else if (lower.includes('bollywood') || lower.includes('hindi') || lower.includes('sauth')) {
      language = 'Hindi';
      title = `${rawClean} Bollywood & South Hindi Dubbed Hub`;
      tags = ['#bollywood', '#southhindi', '#hindidubbed', '#blockbuster'];
    } else if (lower.includes('somali') || lower.includes('fanproj') || lower.includes('caawiye') || lower.includes('saan') || lower.includes('bidhaan') || lower.includes('kaptan') || lower.includes('kurulus')) {
      language = 'All / Multilingual';
      region = 'Africa';
      title = `${rawClean} Somali Musalsal & Film TV HD`;
      tags = ['#somalifilms', '#musalsal', '#somali', '#turkishdrama'];
    } else if (lower.includes('burmese') || lower.includes('kyaungni') || lower.includes('myanmar')) {
      language = 'All / Multilingual';
      region = 'Asia Pacific';
      title = `${rawClean} Burmese Series & Movies Channel`;
      tags = ['#burmeseseries', '#myanmarmovies', '#myanmarcinema'];
    } else {
      title = `${rawClean} HD Movies & Series Updates`;
    }

    description = `Stream updates, OTT release alerts, trailers, HD film reviews, box office reports, and recommendations across Tamil, Bollywood, Malayalam, Hollywood, and regional cinema.`;
    rankKeywords = [
      `${lower} telegram link`,
      'hd movies channel telegram',
      'latest ott web series telegram group',
      'film reviews and download telegram'
    ];
  } else if (lower.includes('anime') || lower.includes('onichan')) {
    category = 'Anime & Manga';
    language = 'Japanese';
    tags = ['#anime', '#manga', '#otaku', '#seasonal_anime', '#subindo'];
    title = `${rawClean} Seasonal Anime Gallery & Subs`;
    description = `HD anime episodes, season premiere calendars, subtitled releases, wallpapers, and community manga discussions for Otaku fans worldwide.`;
    rankKeywords = [`${lower} telegram`, 'anime seasonal gallery telegram link', 'anime subtitles telegram'];
  } else if (
    lower.includes('crypto') || 
    lower.includes('airdrop') || 
    lower.includes('trading') || 
    lower.includes('signals') || 
    lower.includes('1xbet') || 
    lower.includes('lottery') || 
    lower.includes('earning') ||
    lower.includes('commodity') ||
    lower.includes('dalal')
  ) {
    category = 'Crypto & Web3';
    tags = ['#crypto', '#airdrop', '#trading', '#signals', '#bitcoin', '#alpha'];
    title = `${rawClean} Crypto Airdrops & Trading Signals`;
    description = `Verified crypto testnet airdrops, DeFi opportunities, technical analysis charting, futures signals, and real-time market updates.`;
    rankKeywords = [`${lower} telegram link`, 'crypto airdrop telegram channel', 'free crypto trading signals telegram'];
  } else if (
    lower.includes('deal') || 
    lower.includes('offer') || 
    lower.includes('loot') || 
    lower.includes('shopping') || 
    lower.includes('sale')
  ) {
    category = 'Shopping & Deals';
    tags = ['#deals', '#lootoffers', '#amazondeals', '#flipkart', '#discounts', '#shopping'];
    title = `${rawClean} Loot Deals & Price Drop Offers`;
    description = `Instant notifications for 80%+ discount loot deals, lightning sales, promo coupons, Amazon/Flipkart glitch offers, and daily price tracking.`;
    rankKeywords = [`${lower} telegram`, 'best loot deals telegram channel', 'shopping promo code offers telegram'];
  } else if (
    lower.includes('quote') || 
    lower.includes('status') || 
    lower.includes('motivation') || 
    lower.includes('mind') || 
    lower.includes('shayari') || 
    lower.includes('love') ||
    lower.includes('positive') ||
    lower.includes('vibe')
  ) {
    category = 'Lifestyle & Fitness';
    language = 'Hindi';
    tags = ['#motivation', '#quotes', '#shayari', '#dailyquotes', '#positivity', '#status'];
    title = `${rawClean} Daily Motivation & Thought Inspiration`;
    description = `Curated collection of uplifting daily quotes, positive mindfulness thoughts, deep attitude status lines, and life improvement wisdom.`;
    rankKeywords = [`${lower} telegram link`, 'daily motivational quotes telegram', 'attitude shayari status telegram channel'];
  } else if (
    lower.includes('song') || 
    lower.includes('bgm') || 
    lower.includes('music') || 
    lower.includes('beats') || 
    lower.includes('kpop') ||
    lower.includes('mp3')
  ) {
    category = 'Music & Audio';
    tags = ['#music', '#bgm', '#songs', '#ringtone', '#audio', '#kpop'];
    title = `${rawClean} HD Music, BGM & Audio Tracks`;
    description = `HQ lossless audio tracks, trending background music, 320kbps releases, status snippets, and regional melodies updated continuously.`;
    rankKeywords = [`${lower} telegram`, 'bgm songs telegram channel link', 'mp3 audio tracks telegram group'];
  } else if (
    lower.includes('edit') || 
    lower.includes('photo') || 
    lower.includes('video') || 
    lower.includes('creation')
  ) {
    category = 'Art & Design';
    tags = ['#videoedits', '#presets', '#lightroom', '#capcut', '#statusedit', '#alightmotion'];
    title = `${rawClean} Video Editing & Creative Presets`;
    description = `Free XML templates, Alight Motion project packages, CapCut effects, trending reels audio, and 4K editing assets for creators.`;
    rankKeywords = [`${lower} telegram link`, 'alight motion editing presets telegram', 'video status editing telegram channel'];
  } else if (
    lower.includes('tech') || 
    lower.includes('program') || 
    lower.includes('code') || 
    lower.includes('hack') || 
    lower.includes('trick')
  ) {
    category = 'Tech & Programming';
    tags = ['#tech', '#coding', '#software', '#techtricks', '#development'];
    title = `${rawClean} Tech News, Tricks & Developer Hub`;
    description = `Tech tutorials, programming roadmaps, secret tech tricks, open-source utilities, and gadget news for tech enthusiasts.`;
    rankKeywords = [`${lower} telegram`, 'tech tricks telegram channel', 'programming resources telegram link'];
  }

  // Calculate high rank scores and metrics
  const memberBase = 8500 + ((index * 733) % 85000);
  const clicksBase = 450 + ((index * 137) % 4500);
  const upvotesBase = 65 + ((index * 43) % 750);
  const bookmarksBase = 40 + ((index * 29) % 480);
  const growth = 14.5 + (((index * 3.7) % 320) / 10);
  const rankScore = 91 + (index % 9);
  const slug = `tg-${handle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;

  const baseTimestamp = new Date('2026-06-01T00:00:00.000Z').getTime();
  const dateOffsetHours = (index % 120) * 1.5;
  const createdAt = new Date(baseTimestamp - dateOffsetHours * 3600 * 1000).toISOString();

  return {
    id: `tg-group-${index + 1}-${handle.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
    title,
    description,
    url,
    platform: 'telegram',
    category,
    language,
    region,
    customTags: tags,
    imageUrl: getCategoryFallbackImage(category, false, title),
    bannerUrl: getCategoryFallbackImage(category, true, title),
    memberCount: memberBase,
    growthRate: Math.round(growth * 10) / 10,
    clicks: 0,
    upvotes: 0,
    shares: 0,
    bookmarks: 0,
    rating: 0,
    ratingCount: 0,
    comments: [],
    verified: index % 3 !== 1, // 66% verified
    featured: index % 7 === 0, // top picks
    isNsfw: false,
    safetyScore: 96 + (index % 4),
    rankScore,
    rankGrade: rankScore >= 96 ? 'A+' : 'A',
    rankKeywords,
    slug,
    metaDescription: `Join ${title} on Telegram (${url}). Discover active community discussions, verified updates, and exclusive resources in ${category}.`,
    createdAt,
    lastActive: `${(index % 18) + 1} mins ago`,
    rulesSummary: 'No spamming, stay respectful, follow Telegram Community Guidelines.',
  };
}

export function getAllTelegramDefaultGroups(): Group[] {
  return TELEGRAM_RAW_SEEDS.map((item, index) => parseHandleToGroup(item, index));
}
