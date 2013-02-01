using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Threading.Tasks;
using Vidyano.Common;

namespace Vidyano.ViewModel
{
    [DebuggerDisplay("PersistentObjectAttributeWithReference {Name}={Value} ({ObjectId,nq})")]
    public class PersistentObjectAttributeWithReference : PersistentObjectAttribute
    {
        internal PersistentObjectAttributeWithReference(JObject model, PersistentObject parent) :
            base(model, parent)
        {
            propertiesToBackup = new[] { "value", "isReadOnly", "isValueChanged", "options", "objectId", "validationError" };

            var lookup = (JObject)model["lookup"];
            if (lookup != null)
                Lookup = new Query(lookup);
        }

        public string ObjectId
        {
            get { return GetProperty<string>(); }
            internal set
            {
                if (SetProperty(value) && SelectInPlace)
                {
                    OnPropertyChanged("SelectedReferenceValue");
                    OnPropertyChanged("CanOpen");
                    OnPropertyChanged("CanRemoveReference");
                }
            }
        }

        public string DisplayAttribute { get { return GetProperty<string>(); } }

        public bool SelectInPlace { get { return GetProperty<bool>(); } }

        public bool CanRemoveReference
        {
            get { return !IsRequired && ObjectId != null; }
        }

        public bool CanOpen
        {
            get
            {
                return ObjectId != null && Lookup.CanRead;
            }
        }

        public override Option[] Options
        {
            get
            {
                var options = new List<Option>();

                if (!IsRequired && Type != DataTypes.Enum)
                    options.Add(new Option(null, string.Empty));

                var optionsDirect = OptionsDirect ?? new string[0];
                optionsDirect.Run(o =>
                {
                    var parts = o.Split(new[] { '=' }, 2);
                    if (parts.Length == 2)
                        options.Add(new Option(parts[0], parts[1]));
                });

                return options.ToArray();
            }
        }

        public string SelectedReferenceValue
        {
            get
            {
                return ObjectId;
            }
            set
            {
                if (PropertyChanging == "Options")
                    return;

                if (SelectInPlace && ObjectId != value)
                {
#pragma warning disable 4014
                    if (value != null)
                        ChangeReference(new QueryResultItem(value));
                    else if (CanRemoveReference)
                        ChangeReference(null);
#pragma warning restore 4014
                }
            }
        }

        public bool CanAddNewReference { get { return GetProperty<bool>(); } }

        public Query Lookup { get; private set; }

        public async Task ChangeReference(QueryResultItem queryResultItem)
        {
            var parameters = new Dictionary<string, string> { { "PersistentObjectAttributeId", Id } };
            try
            {
                var po = await Service.Current.ExecuteActionAsync("PersistentObject.SelectReference", Parent, Lookup, new[] { queryResultItem }, parameters);

                if (po != null && Parent != null)
                    await Parent.RefreshFromResult(po);
            }
            catch (Exception ex)
            {
                var parent = Parent;
                if (parent != null)
                    parent.SetNotification(ex.Message);
            }
        }
    }
}