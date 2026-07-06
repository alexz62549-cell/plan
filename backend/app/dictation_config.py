# 听写播放配置。
# 这里用 Python 文件而不是 JSON，是因为标准 JSON 不能写注释。
# 改完这个文件后，需要重启后端服务才会生效。

DICTATION_CONFIG = {
    # 每个英文单词/短语重复播放几遍。
    # 例如 3 表示 library 会播放 3 次。
    "repeat_each_word": 3,

    # 同一个单词重复播放之间的停顿时间，单位毫秒。
    # 数值越大，孩子越有时间反应。
    "pause_between_repeats_ms": 1200,

    # 不同单词之间的停顿时间，单位毫秒。
    # 这是孩子真正书写的主要等待时间。
    "pause_between_words_ms": 6000,

    # 是否播放中文提示。
    # False：只播放英文，适合正式听写。
    # True：会播放中文提示，适合练习或低年级辅助。
    "play_hint": False,

    # 当 play_hint=True 时，中文提示是否放在英文前面。
    # True：先播放“图书馆”，再播放“library”。
    # False：先播放“library”，再播放“图书馆”。
    "hint_before_word": True,

    # 英文 TTS 音色。edge-tts 可用音色示例：
    # en-US-AriaNeural：美式女声，比较自然。
    # en-US-GuyNeural：美式男声。
    # en-GB-SoniaNeural：英式女声。
    # en-GB-RyanNeural：英式男声。
    "english_voice": "en-US-AriaNeural",

    # 中文 TTS 音色，仅 play_hint=True 时使用。
    # zh-CN-XiaoxiaoNeural：普通话女声，比较自然。
    # zh-CN-YunxiNeural：普通话男声。
    "chinese_voice": "zh-CN-XiaoxiaoNeural",

    # 英文语速。
    # "+0%" 是正常速度；"-10%" 稍慢；"+10%" 稍快。
    "english_rate": "-5%",

    # 中文提示语速。
    "chinese_rate": "+0%",

    # 是否在家长录入/导入单词后立即生成音频。
    # True：录入慢一点，但孩子端播放最稳定。
    # False：预留给以后“首次播放时再生成”的模式。
    "generate_audio_on_save": True,
}
