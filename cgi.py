"""
Polyfill for the deprecated cgi module removed in Python 3.13.
This allows older packages like httpx 0.13.3 to still import `cgi`.
"""
import email.message

def parse_header(line):
    """
    Parse a Content-type like header.
    Return the main content-type and a dictionary of options.
    """
    m = email.message.Message()
    m['content-type'] = line
    params = m.get_params()
    if not params:
        return '', {}
    value = params[0][0]
    pdict = {}
    for p in params[1:]:
        pdict[p[0]] = p[1]
    return value, pdict
