import urllib.request, json
req = urllib.request.Request('http://192.168.137.153:3000/api/v1/match', data=json.dumps({'texts': ['Hello world', 'Good morning']}).encode(), headers={'Content-Type': 'application/json'})
try:
    print(urllib.request.urlopen(req).read().decode())
except Exception as e:
    if hasattr(e, 'read'):
        print(e.read().decode())
    else:
        print(e)
