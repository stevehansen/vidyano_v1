using Microsoft.Live;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.ComponentModel;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Input;
using Vidyano.Commands;
using Vidyano.Common;
using Vidyano.ViewModel;
using Windows.ApplicationModel;
using Windows.Security.Credentials;
using Windows.Storage;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Media.Imaging;

namespace Vidyano
{
    #if DEBUG && SLOWNETWORKPERFORMANCE
    class SlowHttpClient : HttpClient
    {
        public override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, System.Threading.CancellationToken cancellationToken)
        {
            var response = await base.SendAsync(request, cancellationToken);
            await Task.Delay(1000);

            return response;
        }
    }
    #endif

    public class Service : NotifyableBase
    {
        private static readonly HashSet<Type> defaultConverterTypes = new HashSet<Type>(new[]
            {
                typeof(byte), typeof(sbyte), typeof(char), typeof(short), typeof(ushort), typeof(int), typeof(uint), typeof(long), typeof(ulong), typeof(float), typeof(double), typeof(decimal), typeof(bool), typeof(Guid), typeof(string),
                typeof(byte?), typeof(sbyte?), typeof(char?), typeof(short?), typeof(ushort?), typeof(int?), typeof(uint?), typeof(long?), typeof(ulong?), typeof(float?), typeof(double?), typeof(decimal?), typeof(bool?), typeof(Guid?), typeof(byte[])
            });
        private static readonly ConcurrentDictionary<Type, object> defaultValues = new ConcurrentDictionary<Type, object>();

        internal string AuthToken { get; private set; }
        internal string User { get; private set; }

        private PersistentObject _Application;
        private static Service _Current;
        private bool _IsBusy, _IsConnected, _IsConnectedUsingDefaultCredentials;
        
        private readonly string uniqueId;
        internal static string vaultCredentialsName = string.Format("Vidyano.{0}", Package.Current.Id.Name);

        #if DEBUG && SLOWNETWORKPERFORMANCE
            private readonly HttpClient httpClient = new SlowHttpClient { Timeout = TimeSpan.FromSeconds(10) };
        #else
            private readonly HttpClient httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
        #endif

        private const string sessionStateFilename = "sessionState.jsons";
        private readonly Dictionary<string, object> objects = new Dictionary<string, object>();

        public Service()
        {
            if (!DesignMode.DesignModeEnabled && _Current != null)
                throw new Exception("Only one instance of Service can be active.");

            _Current = this;

            var hwId = Windows.System.Profile.HardwareIdentification.GetPackageSpecificToken(null);
            byte[] encryptedbyteArr;
            Windows.Security.Cryptography.CryptographicBuffer.CopyToByteArray(hwId.Id, out encryptedbyteArr);
            uniqueId = Convert.ToBase64String(encryptedbyteArr);
        }

        #region Properties

        public PersistentObject Application { get { return _Application; } set { SetProperty(ref _Application, value); } }

        public string Uri { get; set; }

        public bool IsBusy { get { return _IsBusy; } set { SetProperty(ref _IsBusy, value); } }

        public bool IsConnected { get { return _IsConnected; } private set { SetProperty(ref _IsConnected, value); } }

        public bool IsConnectedUsingDefaultCredentials { get { return _IsConnectedUsingDefaultCredentials; } internal set { SetProperty(ref _IsConnectedUsingDefaultCredentials, value); } }

        public KeyValueList Messages { get; private set; }

        internal IReadOnlyDictionary<string, ViewModel.Actions.ActionBase.Definition> Actions { get; private set; }

        public static Service Current { get { return _Current; } }

        #endregion

        #region Service Call Methods

        internal void CancelPendingServiceCalls()
        {
            httpClient.CancelPendingRequests();
        }

        public async Task<JObject> GetLanguages()
        {
            try
            {
                IsBusy = true;
                return JObject.Parse(await httpClient.GetStringAsync(new Uri(Uri) + "GetLanguages"));
            }
            catch
            {
                // Ignore no internet/service
                return null;
            }
            finally
            {
                IsBusy = false;
            }
        }

        internal async Task<LiveLoginResult> LiveSignInAsync(params string[] liveScopes)
        {
            try
            {
                IsBusy = true;

                var client = new LiveAuthClient();
                return await client.LoginAsync(liveScopes);
            }
            finally
            {
                IsBusy = false;
            }
        }

        private JObject CreateData(string user = null, string authToken = null)
        {
            var data = new JObject();
            
            data["userName"] = user ?? User;
            data["authToken"] = authToken ?? AuthToken;

            data["uniqueId"] = uniqueId;
            data["environment"] = "WindowsStore";
            data["applicationSpecificPersistentObjects"] = Settings.Current.AppSpecificPersistentObjects;
            data["requestedExpiration"] = ToServiceString(DateTimeOffset.Now.AddYears(1));

            return data;
        }

        internal async Task<PersistentObject> SignInAsync(string user, string password, string token = null, string accessToken = null)
        {
            try
            {
                IsBusy = true;

                var data = CreateData(user, token);
                if (string.IsNullOrEmpty(accessToken))
                    data["password"] = password;
                else
                {
                    data.Remove("userName");
                    data.Remove("authToken");
                    data["accessToken"] = accessToken;
                }

                var responseMsg = await httpClient.PostAsync(new Uri(Uri) + "GetApplication", new StringContent(data.ToString(Formatting.None)));
                var response = JObject.Parse(await responseMsg.Content.ReadAsStringAsync());

                var ex = (string)response["exception"];
                if (!string.IsNullOrEmpty(ex))
                    throw new Exception(ex);

                User = (string)response["userName"] ?? user;
                AuthToken = (string)response["authToken"];
                Application = new PersistentObject((JObject)response["application"]);

                Messages = new KeyValueList(Application.Queries.FirstOrDefault(q => q.Name == "ClientMessages").ToDictionary(item => (string)item["Key"], item => (string)item["Value"]), true);
                Actions = Application.Queries.FirstOrDefault(q => q.Name == "Actions").ToDictionary(item => (string)item["Name"], item => new Vidyano.ViewModel.Actions.ActionBase.Definition
                {
                    Name = (string)item["Name"],
                    DisplayName = (string)item["DisplayName"],
                    IsPinned = (bool)item["IsPinned"],
                    RefreshQueryOnCompleted = (bool)item["RefreshQueryOnCompleted"],
                    Offset = (int)item["Offset"],
                    Options = ((string)item["Options"] ?? string.Empty).Trim().Split(new[] { ';' }, StringSplitOptions.RemoveEmptyEntries).Select(str => str.Trim()).ToArray(),
                    SelectionRule = ExpressionParser.Get((string)item["SelectionRule"])
                });

                var bulkEdit = Actions["BulkEdit"];
                bulkEdit.SelectionRule = ExpressionParser.Get("=1");
            }
            finally
            {
                IsBusy = false;
            }

            IsConnected = true;

            return Application;
        }

        public async Task<PersistentObject> GetPersistentObjectAsync(string id, string objectId)
        {
            try
            {
                IsBusy = true;

                var data = CreateData();
                data["persistentObjectTypeId"] = id;
                data["objectId"] = objectId;

                var responseMsg = await httpClient.PostAsync(new Uri(Uri) + "GetPersistentObject", new StringContent(data.ToString(Formatting.None)));
                var response = JObject.Parse(await responseMsg.Content.ReadAsStringAsync());

                var ex = (string)response["exception"];
                if (!string.IsNullOrEmpty(ex))
                    throw new Exception(ex);

                AuthToken = (string)response["authToken"];

                var result = (JObject)response["result"];
                return result != null ? new PersistentObject(result) : null;
            }
            finally
            {
                IsBusy = false;
            }
        }

        public async Task<Query> GetQueryAsync(string id, string filterName = null)
        {
            try
            {
                IsBusy = true;

                var data = CreateData();
                data["id"] = id;
                data["filterName"] = filterName;

                var responseMsg = await httpClient.PostAsync(new Uri(Uri) + "GetQuery", new StringContent(data.ToString(Formatting.None)));
                var response = JObject.Parse(await responseMsg.Content.ReadAsStringAsync());

                var ex = (string)response["exception"];
                if (!string.IsNullOrEmpty(ex))
                    throw new Exception(ex);

                AuthToken = (string)response["authToken"];

                var result = (JObject)response["query"];
                return result != null ? new Query(result) : null;
            }
            finally
            {
                IsBusy = false;
            }
        }

        public async Task<JObject> ExecuteQueryAsync(Query query, PersistentObject parent = null, string filterName = null, bool asLookup = false)
        {
            try
            {
                IsBusy = true;

                var data = CreateData();
                data["query"] = query.ToServiceObject();
                data["parent"] = parent != null ? parent.ToServiceObject() : null;
                data["filterName"] = filterName;
                data["asLookup"] = asLookup;

                var responseMsg = await httpClient.PostAsync(new Uri(Uri) + "ExecuteQuery", new StringContent(data.ToString(Formatting.None)));
                var response = JObject.Parse(await responseMsg.Content.ReadAsStringAsync());
                if (!string.IsNullOrEmpty((string)response["exception"]))
                    throw new Exception((string)response["exception"]);

                AuthToken = (string)response["authToken"];

                return (JObject)response["result"];
            }
            finally
            {
                IsBusy = false;
            }
        }

        public async Task<Tuple<Stream, string>> GetStreamAsync(PersistentObject registeredStream) //, string action = null, PersistentObject parent = null, Query query = null, QueryResultItem[] selectedItems = null, Dictionary<string, string> parameters = null)
        {
            try
            {
                IsBusy = true;

                var data = CreateData();
                if (registeredStream != null)
                    data["id"] = registeredStream.ObjectId;

                var req = new MultipartFormDataContent("VidyanoBoundary");
                req.Add(new StringContent(data.ToString(Formatting.None)), "data");

                var responseMsg = await httpClient.PostAsync(new Uri(Uri) + "GetStream", req);

                var stream = await responseMsg.Content.ReadAsStreamAsync();
                return Tuple.Create(stream, responseMsg.Content.Headers.ContentDisposition.FileName ?? responseMsg.Content.Headers.ContentDisposition.FileNameStar);
            }
            finally
            {
                IsBusy = false;
            }
        }

        public async Task<PersistentObject> ExecuteActionAsync(string action, PersistentObject parent = null, Query query = null, QueryResultItem[] selectedItems = null, Dictionary<string, string> parameters = null, bool skipHooks = false)
        {
            var isObjectAction = action.StartsWith("PersistentObject.") || query == null;

            try
            {
                IsBusy = true;

                if (!skipHooks)
                {
                    string fullTypeName;
                    if (!isObjectAction)
                    {
                        query.SetNotification(null);
                        fullTypeName = query.PersistentObject.FullTypeName;
                    }
                    else
                    {
                        parent.SetNotification(null);
                        fullTypeName = parent.FullTypeName;
                    }

                    var args = new ExecuteActionArgs(action) { Parameters = parameters, PersistentObject = parent, Query = query, SelectedItems = selectedItems };
                    await ((Client)Client.Current).Hooks.OnAction(args);

                    if (args.IsHandled)
                        return args.Result;

                    args.IsHandled = ClientActions.Get(fullTypeName).OnAction(args);
                    if (args.IsHandled)
                        return args.Result;
                }

                var data = CreateData();
                data["action"] = action;
                data["query"] = query != null ? query.ToServiceObject() : null;
                data["parent"] = parent != null ? parent.ToServiceObject() : null;
                data["selectedItems"] = selectedItems != null ? JArray.FromObject(selectedItems.Select(i => i != null ? i.ToServiceObject() : null)) : null;
                data["parameters"] = parameters != null ? JToken.FromObject(parameters) : null;
                data["skipIncludeQueryResults"] = true;

                var responseMsg = await httpClient.PostAsync(new Uri(Uri) + "ExecuteAction", new StringContent(data.ToString(Formatting.None)));
                var response = JObject.Parse(await responseMsg.Content.ReadAsStringAsync());

                var ex = (string)response["exception"];
                if (!string.IsNullOrEmpty(ex))
                {
                    if (isObjectAction)
                        parent.SetNotification(ex);
                    else
                        query.SetNotification(ex);

                    return null;
                }

                AuthToken = (string)response["authToken"];

                var jPo = (JObject)response["result"];
                return jPo != null ? new PersistentObject(jPo) : null;

            }
            catch (Exception e)
            {
                if (isObjectAction)
                    parent.SetNotification(e.Message);
                else
                    query.SetNotification(e.Message);

                return null;
            }
            finally
            {
                IsBusy = false;
            }
        }

        #endregion

        #region Public Methods

        public void SignOut()
        {
            Application = null;
            User = string.Empty;
            AuthToken = null;
            IsConnected = false;

            try
            {
                var vault = new PasswordVault();

                var vidyanoCredentials = vault.FindAllByResource(vaultCredentialsName).FirstOrDefault();
                if (vidyanoCredentials != null)
                    vault.Remove(vidyanoCredentials);
            }
            catch { }

            var rootFrame = Windows.UI.Xaml.Window.Current.Content as Frame;
            while (rootFrame.CanGoBack)
                rootFrame.GoBack();
        }

        #endregion

        #region Object Caching Methods

        internal string AddCachedObject(ViewModelBase o)
        {
            var frame = (Frame)Windows.UI.Xaml.Window.Current.Content;
            o.PreviousState = frame.GetNavigationState();
            o.PagePath = "Page-" + frame.BackStackDepth;

            var nextPageIndex = frame.BackStackDepth + 1;
            var nextPageKey = o.PagePath;
            while (objects.Remove(nextPageKey))
            {
                nextPageIndex++;
                nextPageKey = "Page-" + nextPageIndex;
            }

            objects[o.PagePath] = o;

            return o.PagePath;
        }

        internal T GetCachedObject<T>(string key) where T : class
        {
            object o;
            objects.TryGetValue(key, out o);

            return o as T;
        }

        internal void CloseCachedObject(ViewModelBase o)
        {
            var frame = (Frame)Windows.UI.Xaml.Window.Current.Content;

            objects.Remove(o.PagePath);

            frame.SetNavigationState(o.PreviousState);
        }

        internal async Task SuspendCache()
        {
            var state = new JObject();

            state["FrameState"] = ((Frame)Windows.UI.Xaml.Window.Current.Content).GetNavigationState();
            state["User"] = User;
            state["AuthToken"] = AuthToken;

            var jObjects = new JObject();
            state["Objects"] = jObjects;

            objects.Values.Run(obj => SerializeCacheObject(jObjects, obj));

            var file = await ApplicationData.Current.LocalFolder.CreateFileAsync(sessionStateFilename, CreationCollisionOption.ReplaceExisting);
            using (var sw = new StreamWriter(await file.OpenStreamForWriteAsync()))
            {
                sw.Write(state.ToString(Formatting.None));
                await sw.FlushAsync();
            }
        }

        private void SerializeCacheObject(JObject jObjects, object obj)
        {
            var po = obj as PersistentObject;
            if (po != null)
            {
                if (jObjects[po.PagePath] != null)
                    return;

                var jPo = new JObject();
                jPo["Type"] = "PersistentObject";
                jPo["Model"] = po.Model;
                if (po.OwnerQuery != null)
                {
                    jPo["OwnerQuery"] = po.OwnerQuery.PagePath;
                    SerializeCacheObject(jObjects, po.OwnerQuery);
                }
                else if (po.OwnerAttributeWithReference != null)
                {
                    jPo["OwnerAttributeWithReference"] = new JObject(new JProperty("Parent", po.OwnerAttributeWithReference.Parent), new JProperty("Name", po.OwnerAttributeWithReference.Name));
                    SerializeCacheObject(jObjects, po.OwnerAttributeWithReference.Parent);
                }

                jObjects[po.PagePath] = jPo;
            }
            else
            {
                var q = obj as Query;
                if (q != null)
                {
                    if (jObjects[q.PagePath] != null)
                        return;

                    var jQuery = new JObject();
                    jQuery["Type"] = "Query";
                    jQuery["Model"] = q.Model;
                    if (q.Parent != null)
                        jQuery["Parent"] = q.Parent.PagePath;

                    jObjects[q.PagePath] = jQuery;
                }
            }
        }

        internal async Task<string> LoadCache()
        {
            try
            {
                var file = await ApplicationData.Current.LocalFolder.GetFileAsync(sessionStateFilename);

                if (file != null)
                {
                    using (var sr = new StreamReader(await file.OpenStreamForReadAsync()))
                    {
                        return sr.ReadToEnd();
                    }
                }
            }
            catch { }

            return null;
        }

        internal async Task<string> ResumeCache(string cache)
        {
            try
            {
                var state = JObject.Parse(cache);

                await SignInAsync((string)state["User"], null, (string)state["AuthToken"]);

                ((JObject)state["Objects"]).Properties().Run(p =>
                {
                    if ((string)p.Value["Type"] == "PersistentObject")
                    {
                        var po = new PersistentObject((JObject)p.Value["Model"]);
                        po.PagePath = p.Name;
                        objects[p.Name] = po;

                        var ownerQueryPath = (string)p.Value["OwnerQuery"];
                        if (ownerQueryPath != null)
                            po.OwnerQuery = (Query)objects[ownerQueryPath];

                        var ownerAttributeWithReferencePath = (JObject)p.Value["OwnerAttributeWithReference"];
                        if (ownerAttributeWithReferencePath != null)
                        {
                            var ownerObject = (PersistentObject)objects[(string)ownerAttributeWithReferencePath["Parent"]];
                            po.OwnerAttributeWithReference = ownerObject.GetAttribute((string)ownerAttributeWithReferencePath["Name"]) as PersistentObjectAttributeWithReference;
                        }
                    }
                    else if ((string)p.Value["Type"] == "Query")
                    {
                        var parentPath = (string)p.Value["Parent"];
                        PersistentObject parent = null;

                        if (!string.IsNullOrEmpty(parentPath))
                            parent = (PersistentObject)objects[parentPath];

                        var q = new Query((JObject)p.Value["Model"], parent);
                        q.PagePath = p.Name;
                        objects[p.Name] = q;
                    }
                });

                return (string)state["FrameState"];
            }
            catch
            {
            }

            return null;
        }

        #endregion

        #region From/To ServiceString

        static object GetDefaultValue(Type type, string dataType = null)
        {
            if (dataType != null)
            {
                if (dataType == "Date")
                    return DateTime.Today;
                if (dataType == "DateTime")
                    return DateTime.Now;
                if (dataType == "DateTimeOffset")
                    return DateTimeOffset.Now;
            }

            return defaultValues.GetOrAdd(type, t => t.GetTypeInfo().IsValueType ? Activator.CreateInstance(t) : null);
        }

        public static Type GetClrType(string type)
        {
            if (string.IsNullOrEmpty(type))
                return typeof(string);

            switch (type.ToUpperInvariant())
            {
                case "INT32":
                    return typeof(int);

                case "NULLABLEINT32":
                    return typeof(int?);

                case "UINT32":
                    return typeof(uint);

                case "NULLABLEUINT32":
                    return typeof(uint?);

                case "INT16":
                    return typeof(short);

                case "NULLABLEINT16":
                    return typeof(short?);

                case "UINT16":
                    return typeof(ushort);

                case "NULLABLEUINT16":
                    return typeof(ushort?);

                case "INT64":
                    return typeof(long);

                case "NULLABLEINT64":
                    return typeof(long?);

                case "UINT64":
                    return typeof(ulong);

                case "NULLABLEUINT64":
                    return typeof(ulong?);

                case "DECIMAL":
                    return typeof(decimal);

                case "NULLABLEDECIMAL":
                    return typeof(decimal?);

                case "DOUBLE":
                    return typeof(double);

                case "NULLABLEDOUBLE":
                    return typeof(double?);

                case "SINGLE":
                    return typeof(float);

                case "NULLABLESINGLE":
                    return typeof(float?);

                case "BYTE":
                    return typeof(byte);

                case "NULLABLEBYTE":
                    return typeof(byte?);

                case "SBYTE":
                    return typeof(sbyte);

                case "NULLABLESBYTE":
                    return typeof(sbyte?);

                case "TIME":
                    return typeof(TimeSpan);

                case "NULLABLETIME":
                    return typeof(TimeSpan?);

                case "DATETIME":
                case "DATE":
                    return typeof(DateTime);

                case "NULLABLEDATETIME":
                case "NULLABLEDATE":
                    return typeof(DateTime?);

                case "DATETIMEOFFSET":
                    return typeof(DateTimeOffset);

                case "NULLABLEDATETIMEOFFSET":
                    return typeof(DateTimeOffset?);

                case "BOOLEAN":
                case "YESNO":
                    return typeof(bool);

                case "NULLABLEBOOLEAN":
                    return typeof(bool?);

                case "ENUM":
                case "FLAGSENUM":
                    return typeof(Enum); // NOTE: Can't know correct Enum type

                case "IMAGE":
                    return typeof(byte[]);

                case "GUID":
                    return typeof(Guid);

                case "NULLABLEGUID":
                    return typeof(Guid?);

                default:
                    return typeof(string);
            }
        }

        public static object FromServiceString(string value, string typeName)
        {
            var type = GetClrType(typeName);

            try
            {
                if (type == typeof(string))
                    return value;

                if (value == null)
                    return GetDefaultValue(type, typeName);

                if (value == string.Empty && Nullable.GetUnderlyingType(type) != null)
                    return GetDefaultValue(type, typeName);

                if (type == typeof(Guid) || type == typeof(Guid?))
                    return Guid.Parse(value);

                if (type == typeof(Enum) || type.GetTypeInfo().IsEnum)
                    return value;

                if (typeName == "Image")
                {
                    var bmi = new BitmapImage();
#pragma warning disable 4014
                    bmi.SetSourceAsync(new InMemoryRandomAccessStream(new MemoryStream(Convert.FromBase64String(value), true)));
#pragma warning restore 4014
                    return bmi;
                }

                if (type == typeof(byte[]))
                    return Convert.FromBase64String(value);

                if (defaultConverterTypes.Contains(type))
                {
                    var underlyingType = Nullable.GetUnderlyingType(type);
                    if (underlyingType != null)
                        type = underlyingType;

                    return Convert.ChangeType(value, type, CultureInfo.InvariantCulture);
                }

                if (type == typeof(DateTime) || type == typeof(DateTime?))
                    return DateTime.ParseExact(value, "dd-MM-yyyy HH:mm:ss.FFFFFFF", CultureInfo.InvariantCulture);

                if (type == typeof(DateTimeOffset) || type == typeof(DateTimeOffset?))
                    return DateTimeOffset.ParseExact(value, "dd-MM-yyyy HH:mm:ss.FFFFFFF K", CultureInfo.InvariantCulture);

                if (type == typeof(TimeSpan) || type == typeof(TimeSpan?))
                    return TimeSpan.ParseExact(value, "G", CultureInfo.InvariantCulture);

                return null;
            }
            catch
            {
                return GetDefaultValue(type, typeName);
            }
        }

        public static string ToServiceString(object value)
        {
            if (value == null)
                return null;

            var type = value.GetType();

            if (type == typeof(string))
                return (string)value;

            if (type == typeof(byte[]))
                return Convert.ToBase64String((byte[])value);

            if (defaultConverterTypes.Contains(type))
                return Convert.ToString(value, CultureInfo.InvariantCulture);

            if (type == typeof(DateTime) || type == typeof(DateTime?))
                return ((DateTime)value).ToString("dd-MM-yyyy HH:mm:ss.FFFFFFF", CultureInfo.InvariantCulture);

            if (type == typeof(DateTimeOffset) || type == typeof(DateTimeOffset?))
                return ((DateTimeOffset)value).ToString("dd-MM-yyyy HH:mm:ss.FFFFFFF K", CultureInfo.InvariantCulture);

            if (type == typeof(TimeSpan) || type == typeof(TimeSpan?))
                return ((TimeSpan)value).ToString("G", CultureInfo.InvariantCulture);

            return value.ToString();
        }

        #endregion
    }
}
