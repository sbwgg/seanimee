/**
 * Quality related regexes (sources, resolution, codecs, etc.)
 */
export default {
    codecs: [
        /(?<x264>[Xx]264)/i,
        /(?<h264>[Hh]264)/i,
        /(?<x265>[Xx]265)/i,
        /(?<x265>[(\[-_. ][Xx]265[)\]-_. ])/i,
        /(?<h265>[Hh]265)/i,
        /(?<hi444pp>Hi444PP)/i,
        /(?<xvidhd>XVIDHD)/i,
        /(?<divx>divx)/i,
        /(?<eac3>E-?AC-?3)/i,
        /(?<aac>AAC)/i,
        /(?<ac3>[Aa]c3|AC3)/i,
        /(?<yuv444p10>YUV444P10)/i,
        /(?<av1>AV1)/i,
        /(?<flac>FLAC(?:x2)?)/i,
        /[-_. ]?(?<flac>FLAC)[-_. ]?/i,
        /(?<flac>Flac)/i,
        /(?<_10bit>10[-._ ]?[Bb]its?)/i,
        /[_.-]?(?<_10bit>10bpp)[_.-]?/i,
        /(?<_10bit>H[iI]10P)/i,
        /(?<_10bit>H[iI]10)/i,
        /(?<_8bit>8[-._ ]?bits?)/i,
        /(?<hevc>hevc)/i,
        /(?<hevc>HEVC)/i,
        /(?<hevc>[(\[-_. ]HEVC[)\]-_. ])/i,
        /(?<dual_audio>\bDual[-_. ]Audio\b)/i,
        /(?<dual_audio>\bDUAL[-._ ]AUD[Ii]O\b)/i,
        /(?<dts_hdma>\bDTSHDMA?\b)/i,
        /(?<dts_hdma>\bDTS-?HD[-_. ]?MA(?:[-_. ]6.1)?\b)/i,
        /[-_. ]?(?<avc>AVC)[-_. ]?/i,
        /(?<audio_5_1>\b(?:DD)?5\.1\b)/i,
        /(?<dts>\bDTS\b)/i,
        /(?<true_hd>\bTrueHD\b)/i,
        /(?<lpcm>\bLPCM\b)/i,
    ],
    distributor: [
        /(?<apple_tv>\bATVP\b)/,
        /(?<amazon>\bAMZN-DL\b)/,
        /(?<amazon>\bAMZN\b)/,
        /(?<comedy_central>\bCC\b)/,
        /(?<crunchy_roll>\bCR\b)/,
        /(?<disney>\bDSNP\b)/,
        /(?<disney>\bDSNY\b)/,
        /(?<fox>\bFOX\b)/,
        /(?<hulu>\bHULU\b)/,
        /(?<disney>\bDSNY\b)/,
        /(?<mtv>\bMTV\b)/,
        /(?<netflix>\bNF\b)/,
        /(?<tf1>\bTF1\b)/,
        /(?<bs11>\bBS11\b)/,
        /(?<tv_asahi>\bTV Asahi\b)/,
        /(?<tokyo_tv>\bTokyo TV\b)/,
        /(?<at_x>AT-[Xx])/,
    ],
    resolution: [
        /(?:HD\s?)?(?<_1080p>1080[Pp])(?:\s?HD)?/,
        /(?<_1080p>1920x1080)/,
        /(?:HD\s?)?(?<_720p>720[Pp])(?:\s?HD)?/,
        /(?<_720p>1280x720)/,
        /(?<_480p>480[Pp])/,
        /(?<_480p>640x480)/,
        /(?<_480p>848x480)/,
        /(?<_576p>576[Pp])/,
        /(?<_544p>544[Pp])/,
        /(?<_540p>540[Pp])/,
        /(?<_2160p>2160[Pp])/,
        /(?<_4K>4[Kk])/,
        /(?<_16_9>720x480|768x576)/,
    ],
    source: [
        /(?<bluray>[Bb]lu-?[Rr]ay (?:RIP|[Rr]ip))/i,
        /(?<bluray>BD(?:RIP|[Rr]ip))/i,
        /(?<bluray>BR(?:RIP|[Rr]ip))/i,
        /(?<=[^A-Za-z])(?<bluray>B[RD])(?=[^A-Za-z])/i,
        /(?<bluray>BLU-?RAY)/i,
        /(?<bluray>[Bb]lu-?[Rr]ay)(?!\w)/i,
        /(?<bluray>HD-?DVD)/i,
        /(?<bluray>BD(?=REMUX))/i,
        /(?<webdl>WEB[-_. ]?DL)/i,
        /(?<webdl>WEB-?R[Ii][Pp])/i,
        /(?<webdl>WEBHD)/i,
        /(?<webdl>\bONA\b)/i,
        /(?<dvd>DVDR[Ii][Pp])/i,
        /(?<dvd>[Dd]vd\s?[Rr]ip)/i,
        /(?<dvd>DVD)/i,
        /(?<dvd>\bNTSC\b)/i,
        /(?<dvd>\bPAL\b)/i,
        /(?<dvd>XVIDDVD)/i,
        /(?<dd>\bDD\b)/i,
        /(?<dsr>\bWS[-_. ]DSR\b)/i,
        /(?<dsr>\bDSR\b)/i,
        /(?<hdtv>HDTV)/i,
        /(?<pdtv>PDTV)/i,
        /(?<sdtv>SDTV)/i,
        /(?<tvrip>TVRIP)/i,
        /(?<tvrip>TV[-_. ]?[Rr]ip)/i,
        /(?<camrip>CAM[-_. ]?RIP)/i,
        /(?<raw>\bRAW\b)/i,
    ],

}