function Resource(item) {
    /// <summary>Describes either an Icon or a Template.</summary>

    /// <field name="key" type="String">The unique identifier for this resource.</field>
    this.key = item.getValue("Key");
    /// <field name="data">The data for this resource, can be a base64 string for Icons or a Function for Templates.</field>
    this.data = item.getValue("Data");
};