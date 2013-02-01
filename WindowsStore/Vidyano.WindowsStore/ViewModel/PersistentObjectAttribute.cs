using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Diagnostics;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Input;
using Vidyano.Common;

namespace Vidyano.ViewModel
{
    [DebuggerDisplay("PersistentObjectAttribute {Name}={Value}")]
    public class PersistentObjectAttribute : ViewModelBase
    {
        private volatile KeyValueList _TypeHints;
        private readonly Lazy<Type> clrType;

        protected string[] propertiesToBackup = new[] { "value", "isReadOnly", "isValueChanged", "options", "validationError" };

        internal PersistentObjectAttribute(JObject model, PersistentObject parent) :
            base(model)
        {
            Parent = parent;
            clrType = new Lazy<Type>(() => Service.GetClrType(Type));

            ShowValidationError = new Commands.ActionCommand(err => { ((Client)Client.Current).Hooks.ShowNotification((string)err, NotificationType.Error, true); }, p => HasValidationError, this, "HasValidationError");
        }

        internal string Id { get { return GetProperty<string>(); } }

        public string Name { get { return GetProperty<string>(); } }

        public string Type { get { return GetProperty<string>(); } }

        public Type ClrType
        {
            get
            {
                return clrType.Value;
            }
        }

        public string Label { get { return GetProperty<string>(); } }

        public int Offset { get { return GetProperty<int>(); } }

        public string Rules { get { return GetProperty<string>() ?? string.Empty; } }

        internal string[] OptionsDirect
        {
            get { return GetProperty<string[]>("Options"); }
            set
            {
                if (OptionsDirect != null && value != null && OptionsDirect.SequenceEqual(value))
                    return;

                SetProperty(value, "Options");
            }
        }

        public virtual Option[] Options
        {
            get
            {
                var options = new List<Option>();

                if (!IsRequired && Type != DataTypes.Enum)
                    options.Add(new Option(null, string.Empty));

                if (Type == DataTypes.NullableBoolean)
                {
                    options.Add(new Option(true, Service.Current.Messages["True"]));
                    options.Add(new Option(false, Service.Current.Messages["False"]));
                }
                else if (Type == DataTypes.DropDown || Type == DataTypes.Enum || Type == DataTypes.ComboBox)
                {
                    var optionsDirect = OptionsDirect ?? new string[0];
                    optionsDirect.Run(o => options.Add(new Option(o, o)));
                }
                else if (Type == DataTypes.KeyValueList)
                    options.AddRange(OptionsDirect.Select(o => o.Split(new[] { '=' }, 2)).Select(p => new Option(p[0], p[1])));

                return options.ToArray();
            }
        }

        public string GroupName { get { return GetProperty<string>("Group"); } }

        public PersistentObjectAttributeGroup Group { get; internal set; }

        public string Tab { get { return GetProperty<string>(); } }

        public string ToolTip { get { return GetProperty<string>(); } }

        public bool IsReadOnly { get { return GetProperty<bool>(); } internal set { SetProperty(value); } }

        public bool TriggersRefresh { get { return GetProperty<bool>(); } internal set { SetProperty(value); } }

        public bool IsValueChanged { get { return GetProperty<bool>(); } internal set { SetProperty(value); } }

        public KeyValueList TypeHints
        {
            get
            {
                if (_TypeHints == null)
                {
                    lock (Model)
                    {
                        if (_TypeHints == null)
                        {
                            Dictionary<string, string> dict = null;
                            var typeHints = (JObject)Model["typeHints"];
                            if (typeHints != null)
                                dict = typeHints.Properties().ToDictionary(p => p.Name, p => (string)p);

                            _TypeHints = new KeyValueList(new ReadOnlyDictionary<string, string>(dict ?? new Dictionary<string, string>()));
                        }
                    }
                }

                return _TypeHints;
            }
        }

        public bool IsRequired { get { return GetProperty<bool>(); } internal set { SetProperty(value); } }

        internal string ValueDirect
        {
            get { return GetProperty<string>("Value"); }
            set
            {
                SetProperty(value, "Value");
                OnPropertyChanged("DisplayValue");
            }
        }

        public object Value
        {
            get { return Service.FromServiceString(GetProperty<string>(), Type); }
            set
            {
                if (IsReadOnly)
                    return;

                if (SetProperty(Service.ToServiceString(value)))
                {
                    IsValueChanged = true;
                    Parent.IsDirty = true;
                    OnPropertyChanged("DisplayValue");

                    if (Parent != null && TriggersRefresh)
                    {
#pragma warning disable 4014
                        Parent.RefreshAttributesAsync(this);
#pragma warning restore 4014
                    }
                }
            }
        }

        public string DisplayValue
        {
            get
            {
                return GetDisplayValue(Value, Type, TypeHints, Options);
            }
        }

        public string ValidationError
        {
            get { return GetProperty<string>(); }
            internal set
            {
                SetProperty(value);
                OnPropertyChanged("HasValidationError");
            }
        }

        public bool HasValidationError
        {
            get
            {
                return !string.IsNullOrEmpty(ValidationError);
            }
        }

        public ICommand ShowValidationError { get; private set; }

        public bool IsVisible
        {
            get
            {
                return Parent.IsNew ? Visibility.HasFlag(AttributeVisibility.New) : Visibility.HasFlag(AttributeVisibility.Read);
            }
        }

        internal AttributeVisibility Visibility
        {
            get { return (AttributeVisibility)Enum.Parse(typeof(AttributeVisibility), GetProperty<string>()); }
            set
            {
                if (SetProperty(value.ToString()))
                    OnPropertyChanged("IsVisible");
            }
        }

        public PersistentObject Parent { get; private set; }

        internal void BackupBeforeEdit()
        {
            Model["Backup"] = Model.CopyProperties(propertiesToBackup);
        }

        internal void RestoreEditBackup()
        {
            var backup = (JObject)Model["Backup"];
            if (backup != null)
            {
                foreach (var property in backup.Properties())
                {
                    var propertyName = property.Name;
                    Model[propertyName] = property.Value;

                    // Raise property
                    OnPropertyChanged(char.ToUpperInvariant(propertyName[0]) + propertyName.Substring(1));
                }

                Model.Remove("Backup");
            }
        }

        #region Class Methods

        public static string GetDisplayValue(object value, string type, KeyValueList typeHints, Option[] options)
        {
            string text;
            try
            {
                var format = typeHints["DisplayFormat"];
                switch (type)
                {
                    case DataTypes.Time:
                    case DataTypes.NullableTime:
                        {
                            if (value != null)
                            {
                                var time = (TimeSpan)value;
                                text = string.Format(CultureInfo.CurrentCulture, format ?? "{0:" + CultureInfo.CurrentCulture.DateTimeFormat.ShortTimePattern + "}", new DateTime(1, 1, 1, time.Hours, time.Minutes, time.Seconds, time.Milliseconds));
                            }
                            else
                                text = string.Empty;

                            break;
                        }
                    case DataTypes.Date:
                    case DataTypes.NullableDate:
                        text = value != null ? string.Format(CultureInfo.CurrentCulture, format ?? "{0:" + CultureInfo.CurrentCulture.DateTimeFormat.LongDatePattern.Replace("dddd", null).Trim(',', ' ') + "}", value) : string.Empty;
                        break;
                    case DataTypes.DateTime:
                    case DataTypes.NullableDateTime:
                        text = value != null ? string.Format(CultureInfo.CurrentCulture, format ?? "{0:" + CultureInfo.CurrentCulture.DateTimeFormat.LongDatePattern.Replace("dddd", null).Trim(',', ' ') + " " + CultureInfo.CurrentCulture.DateTimeFormat.ShortTimePattern + "}", value) : string.Empty;
                        break;
                    case DataTypes.DateTimeOffset:
                    case DataTypes.NullableDateTimeOffset:
                        text = value != null ? string.Format(CultureInfo.CurrentCulture, format ?? "{0:" + CultureInfo.CurrentCulture.DateTimeFormat.LongDatePattern.Replace("dddd", null).Trim(',', ' ') + " " + CultureInfo.CurrentCulture.DateTimeFormat.ShortTimePattern + " (UTCzzz)}", value) : string.Empty;
                        break;
                    case DataTypes.Boolean:
                    case DataTypes.NullableBoolean:
                        text = value != null ? Service.Current.Messages[((bool)value) ? (typeHints["TrueKey"] ?? "True") : (typeHints["FalseKey"] ?? "False")] : string.Empty;
                        break;
                    case DataTypes.YesNo:
                        text = value != null ? Service.Current.Messages[((bool)value) ? (typeHints["TrueKey"] ?? "Yes") : (typeHints["FalseKey"] ?? "No")] : string.Empty;
                        break;
                    case DataTypes.KeyValueList:
                        text = Convert.ToString(value);
                        if (options != null && options.Length > 0)
                        {
                            foreach (var option in options.Where(option => ((string)option.Key) == text))
                            {
                                text = option.DisplayValue;
                                break;
                            }
                        }
                        break;
                    case DataTypes.BinaryFile:
                        {
                            var str = (value as String) ?? string.Empty;
                            text = str.Split('|').FirstOrDefault();
                        }
                        break;
                    default:
                        text = value != null ? string.Format(CultureInfo.CurrentCulture, format ?? "{0}", value) : string.Empty;
                        break;
                }
            }
            catch
            {
                text = value != null ? value.ToString() : string.Empty;
            }
            return text;
        }

        #endregion

        #region Service Serialization

        protected override string[] GetServiceProperties()
        {
            return new[] { "id", "name", "value", "label", "options", "type", "isReadOnly", "triggersRefresh", "isRequired", "differsInBulkEditMode", "isValueChanged", "displayAttribute", "objectId", "visibility" };
        }

        #endregion

        #region Nested Classes

        public class Option : NotifyableBase
        {
            internal Option(object key, string displayValue)
            {
                Key = key;
                DisplayValue = displayValue;
            }

            public object Key { get; private set; }

            public string DisplayValue { get; private set; }
        }

        #endregion
    }
}